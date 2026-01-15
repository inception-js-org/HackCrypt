import cv2
import json
import numpy as np
import torch
from facenet_pytorch import InceptionResnetV1
import mediapipe as mp

# ---------- UTILS ----------
def cosine_distance(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    return 1 - np.dot(a, b)

# ---------- CONFIG ----------
STUDENT_ID = input("Enter Student ID to verify: ")
DB_PATH = "face_db.json"

# ---------- LOAD FACE DATABASE ----------
with open(DB_PATH, "r") as f:
    face_db = json.load(f)

if STUDENT_ID not in face_db:
    raise ValueError("❌ Student not enrolled")

stored_embedding = np.array(face_db[STUDENT_ID])

# ---------- LOAD FACENET ----------
device = "cuda" if torch.cuda.is_available() else "cpu"
model = InceptionResnetV1(pretrained="vggface2").eval().to(device)

# ---------- MEDIAPIPE ----------
mp_face = mp.solutions.face_detection

cap = cv2.VideoCapture(0)

print("\n🔍 Look at the camera for verification...")

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as face_detection:

    while True:
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
                    live_embedding = model(face_tensor).cpu().numpy()[0]

                # ---------- MATCH ----------
                distance = cosine_distance(live_embedding, stored_embedding)

                if distance < 0.45:
                    verdict = "MATCH"
                    color = (0, 255, 0)
                elif distance < 0.60:
                    verdict = "UNCERTAIN"
                    color = (0, 255, 255)
                else:
                    verdict = "NO MATCH"
                    color = (0, 0, 255)

                cv2.putText(
                    frame,
                    f"{verdict} | Dist: {distance:.2f}",
                    (30, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    color,
                    2,
                )

        cv2.imshow("Face Verification", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
cv2.destroyAllWindows()
