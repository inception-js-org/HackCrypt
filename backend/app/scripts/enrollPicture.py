import cv2
import numpy as np
import os

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- CONFIG ----------
STUDENT_ID = input("Enter Student ID to enroll: ")
IMAGE_PATH = input("Enter path to JPEG image: ").strip('"')

NUM_AUGMENTATIONS = 5

# ---------- INIT ----------
embedder = FaceEmbedder()

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
def augment_image(image, idx):
    """Apply different augmentations based on index"""
    h, w = image.shape[:2]
    
    if idx == 0:
        return image
    elif idx == 1:
        # Slightly brighter
        return cv2.convertScaleAbs(image, alpha=1.1, beta=10)
    elif idx == 2:
        # Slightly darker
        return cv2.convertScaleAbs(image, alpha=0.9, beta=-10)
    elif idx == 3:
        # Small rotation (+5 degrees)
        matrix = cv2.getRotationMatrix2D((w/2, h/2), 5, 1.0)
        return cv2.warpAffine(image, matrix, (w, h))
    elif idx == 4:
        # Small rotation (-5 degrees)
        matrix = cv2.getRotationMatrix2D((w/2, h/2), -5, 1.0)
        return cv2.warpAffine(image, matrix, (w, h))
    
    return image

# ---------- DETECT FACE USING INSIGHTFACE ----------
print("[INFO] Detecting face...")

faces = embedder.app.get(frame)

if len(faces) == 0:
    print("❌ Error: No face detected in the image")
    exit(1)

# Get the largest face by bounding box area
face_data = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
bbox = face_data.bbox.astype(int)
x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]

# Ensure bounds are valid
h, w = frame.shape[:2]
x1, y1 = max(0, x1), max(0, y1)
x2, y2 = min(w, x2), min(h, y2)

face_crop = frame[y1:y2, x1:x2]

if face_crop.size == 0:
    print("❌ Error: Could not extract face region")
    exit(1)

print(f"[INFO] Face detected with confidence: {face_data.det_score:.2f}")

# ---------- GENERATE EMBEDDINGS ----------
embeddings = []

# First embedding from original detection (most accurate)
embeddings.append(face_data.embedding / np.linalg.norm(face_data.embedding))
print(f"[PROCESSED] Original image 1/{NUM_AUGMENTATIONS}")

# Generate embeddings from augmented versions
for i in range(1, NUM_AUGMENTATIONS):
    augmented_frame = augment_image(frame.copy(), i)
    try:
        embedding = embedder.embed(augmented_frame)
        embeddings.append(embedding)
        print(f"[PROCESSED] Augmentation {i + 1}/{NUM_AUGMENTATIONS}")
    except ValueError as e:
        print(f"[SKIPPED] Augmentation {i + 1}/{NUM_AUGMENTATIONS} - {e}")

if len(embeddings) < 2:
    print("❌ Error: Not enough valid embeddings generated")
    exit(1)

# ---------- SHOW DETECTED FACE ----------
display = frame.copy()
cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
cv2.putText(display, f"ID: {STUDENT_ID}", (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
cv2.putText(display, f"Score: {face_data.det_score:.2f}", (x1, y2 + 20),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

cv2.imshow("Detected Face - ArcFace", display)
print("\n[INFO] Press any key to continue...")
cv2.waitKey(0)
cv2.destroyAllWindows()

# ---------- SAVE TO PINECONE ----------
final_embedding = np.mean(embeddings, axis=0)
final_embedding = (final_embedding / np.linalg.norm(final_embedding)).tolist()

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
print(f"Embeddings averaged: {len(embeddings)}")
print(f"Embedding dimension: 512 (ArcFace)")
print("Vector pushed to Pinecone")