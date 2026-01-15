import cv2
import mediapipe as mp
import time

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- PERFORMANCE CONFIG ----------
FRAME_SKIP = 10          # Run recognition every N frames
QUERY_COOLDOWN = 2.0     # Seconds to wait before re-querying Pinecone

# ---------- INIT ----------
embedder = FaceEmbedder()
mp_face = mp.solutions.face_detection
cap = cv2.VideoCapture(0)

frame_count = 0
last_label = "Scanning..."
last_color = (255, 255, 255)
last_query_time = 0
prev_frame_time = 0
fps=0

print("\n[INFO] Starting face identification (press Q to quit)")
print("[INFO] No Student ID required\n")

with mp_face.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.6
) as detector:

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        #fps calcylation start
        current_time = time.time()
        fps=1/(current_time - prev_frame_time) if prev_frame_time>0 else 0
        prev_frame_time = current_time

        # Resize for speed (VERY IMPORTANT)
        frame = cv2.resize(frame, (720, 480))

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = detector.process(rgb)

        frame_count += 1

        if results.detections:
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box

            x1 = max(0, int(bbox.xmin * w))
            y1 = max(0, int(bbox.ymin * h))
            x2 = min(w, x1 + int(bbox.width * w))
            y2 = min(h, y1 + int(bbox.height * h))

            face = frame[y1:y2, x1:x2]

            # Only run heavy logic occasionally
            if (
                face.size > 0
                and frame_count % FRAME_SKIP == 0
                and time.time() - last_query_time > QUERY_COOLDOWN
            ):
                embedding = embedder.embed(face).tolist()

                result = index.query(
                    vector=embedding,
                    top_k=1,
                    include_metadata=True
                )

                if result["matches"]:
                    match = result["matches"][0]
                    score = match["score"]

                    if score >= 0.55:
                        last_label = f"Matched: {match['id']} ({score:.2f})"
                        last_color = (0, 255, 0)
                    else:
                        last_label = "Unknown"
                        last_color = (0, 0, 255)
                else:
                    last_label = "Unknown"
                    last_color = (0, 0, 255)

                last_query_time = time.time()

            cv2.rectangle(frame, (x1, y1), (x2, y2), last_color, 2)

        # Always draw last known result
        cv2.putText(
            frame,
            last_label,
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            last_color,
            2
        )
        # Display FPS
        cv2.putText(
            frame,
            f"FPS: {fps:.1f}",
            (30, 470),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2
        )
        cv2.imshow("Face Identification", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
cv2.destroyAllWindows()
