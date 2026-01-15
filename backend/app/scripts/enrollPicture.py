import cv2
import numpy as np
import mediapipe as mp
import os

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- CONFIG ----------
STUDENT_ID = input("Enter Student ID to enroll: ")
IMAGE_PATH = input("Enter path to JPEG image: ").strip('"')  # Remove quotes if drag-dropped

NUM_AUGMENTATIONS = 5  # Number of augmented samples to generate

# ---------- INIT ----------
embedder = FaceEmbedder()
mp_face = mp.solutions.face_detection

# ---------- VALIDATE FILE ----------
if not os.path.exists(IMAGE_PATH):
    print(f"❌ Error: File not found at {IMAGE_PATH}")
    exit(1)

if not IMAGE_PATH.lower().endswith(('.jpg', '.jpeg', '.png')):
    print("❌ Error: Please provide a JPEG or PNG image")
    exit(1)

# ---------- LOAD IMAGE ----------
frame = cv2.imread(IMAGE_PATH)
if frame is None:
    print("❌ Error: Could not read image")
    exit(1)

print(f"\n[INFO] Enrolling face for {STUDENT_ID} from image")
print(f"[INFO] Generating {NUM_AUGMENTATIONS} augmented samples...\n")

# ---------- AUGMENTATION FUNCTIONS ----------
def augment_image(image, index):
    """Apply different augmentations based on index"""
    h, w = image.shape[:2]
    
    if index == 0:
        # Original
        return image
    elif index == 1:
        # Slightly brighter
        return cv2.convertScaleAbs(image, alpha=1.1, beta=10)
    elif index == 2:
        # Slightly darker
        return cv2.convertScaleAbs(image, alpha=0.9, beta=-10)
    elif index == 3:
        # Small rotation (+5 degrees)
        matrix = cv2.getRotationMatrix2D((w/2, h/2), 5, 1.0)
        return cv2.warpAffine(image, matrix, (w, h))
    elif index == 4:
        # Small rotation (-5 degrees)
        matrix = cv2.getRotationMatrix2D((w/2, h/2), -5, 1.0)
        return cv2.warpAffine(image, matrix, (w, h))
    
    return image

# ---------- DETECT & EMBED ----------
embeddings = []

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as detector:

    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = detector.process(rgb)

    if not results.detections:
        print("❌ Error: No face detected in the image")
        exit(1)

    detection = results.detections[0]
    bbox = detection.location_data.relative_bounding_box

    x1 = max(0, int(bbox.xmin * w))
    y1 = max(0, int(bbox.ymin * h))
    x2 = min(w, x1 + int(bbox.width * w))
    y2 = min(h, y1 + int(bbox.height * h))

    face = frame[y1:y2, x1:x2]

    if face.size == 0:
        print("❌ Error: Could not extract face region")
        exit(1)

    # Generate embeddings from augmented versions
    for i in range(NUM_AUGMENTATIONS):
        augmented_face = augment_image(face, i)
        embedding = embedder.embed(augmented_face)
        embeddings.append(embedding)
        print(f"[PROCESSED] Augmentation {i + 1}/{NUM_AUGMENTATIONS}")

    # Show detected face
    display = frame.copy()
    cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.putText(display, f"ID: {STUDENT_ID}", (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    cv2.imshow("Detected Face", display)
    print("\n[INFO] Press any key to continue...")
    cv2.waitKey(0)
    cv2.destroyAllWindows()

# ---------- SAVE TO PINECONE ----------
final_embedding = np.mean(embeddings, axis=0).tolist()

index.upsert([
    (
        STUDENT_ID,
        final_embedding,
        {"type": "student"}
    )
])

print("\n✅ Enrollment successful")
print(f"Student ID: {STUDENT_ID}")
print(f"Image: {IMAGE_PATH}")
print("Vector pushed to Pinecone")