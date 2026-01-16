import cv2
import json
import numpy as np
import torch
from facenet_pytorch import InceptionResnetV1
import mediapipe as mp
from pathlib import Path

# ---------- CONFIG ----------
STUDENT_ID = input("Enter Student ID: ")
NUM_SAMPLES = 5
DB_PATH = "face_db.json"

# ---------- LOAD FACENET ----------
device = "cuda" if torch.cuda.is_available() else "cpu"
model = InceptionResnetV1(pretrained="vggface2").eval().to(device)

# ---------- MEDIAPIPE ----------
mp_face = mp.solutions.face_detection

cap = cv2.VideoCapture(0)
embeddings = []

print(f"\nEnrolling face for student: {STUDENT_ID}")
print("Look at the camera and move slightly...\n")

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as face_detection:

    while len(embeddings) < NUM_SAMPLES:
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detection.process(rgb)

        if results.detections:
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box

            x1 = max(0, int(bbox.xmin * w))
            y1 = max(0, int(bbox.ymin * h))
            x2 = min(w, x1 + int(bbox.width * w))
            y2 = min(h, y1 + int(bbox.height * h))

            face = frame[y1:y2, x1:x2]

            if face.size > 0:
                face_resized = cv2.resize(face, (160, 160))
                face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)

                face_tensor = (
                    torch.tensor(face_rgb)
                    .permute(2, 0, 1)
                    .unsqueeze(0)
                    .float()
                    / 255.0
                ).to(device)

                with torch.no_grad():
                    embedding = model(face_tensor).cpu().numpy()[0]
                    embeddings.append(embedding)

                print(f"Captured sample {len(embeddings)}/{NUM_SAMPLES}")

                cv2.imshow("Enrolling Face", face_resized)
                cv2.waitKey(500)

        cv2.imshow("Camera", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
cv2.destroyAllWindows()

# ---------- AVERAGE EMBEDDINGS ----------
final_embedding = np.mean(embeddings, axis=0).tolist()

# ---------- SAVE TO DB ----------
db = {}
if Path(DB_PATH).exists():
    with open(DB_PATH, "r") as f:
        db = json.load(f)

db[STUDENT_ID] = final_embedding

with open(DB_PATH, "w") as f:
    json.dump(db, f, indent=2)

print("\n✅ Enrollment complete")
print(f"Embedding size: {len(final_embedding)}")
print(f"Saved to {DB_PATH}")
