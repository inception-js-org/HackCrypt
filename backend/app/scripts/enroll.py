import cv2
import numpy as np
import mediapipe as mp

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- CONFIG ----------
STUDENT_ID = input("Enter Student ID to enroll: ")
NUM_SAMPLES = 5

# ---------- INIT ----------
embedder = FaceEmbedder()
mp_face = mp.solutions.face_detection
cap = cv2.VideoCapture(0)

embeddings = []

print(f"\n[INFO] Enrolling face for {STUDENT_ID}")
print("[INFO] Look at the camera and move slightly...\n")

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as detector:

    while len(embeddings) < NUM_SAMPLES:
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = detector.process(rgb)

        if results.detections:
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box

            x1 = max(0, int(bbox.xmin * w))
            y1 = max(0, int(bbox.ymin * h))
            x2 = min(w, x1 + int(bbox.width * w))
            y2 = min(h, y1 + int(bbox.height * h))

            face = frame[y1:y2, x1:x2]

            if face.size > 0:
                embedding = embedder.embed(face)
                embeddings.append(embedding)

                print(f"[CAPTURED] {len(embeddings)}/{NUM_SAMPLES}")

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.imshow("Enrollment", frame)
                cv2.waitKey(500)

        cv2.imshow("Enrollment", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
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
print("Vector pushed to Pinecone")
