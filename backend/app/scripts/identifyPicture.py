import cv2
import time
from mtcnn import MTCNN

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- PERFORMANCE CONFIG ----------
FRAME_SKIP = 10          # Run recognition every N frames
QUERY_COOLDOWN = 2.0     # Seconds to wait before re-querying Pinecone

# ---------- INIT ----------
embedder = FaceEmbedder()
detector = MTCNN()
cap = cv2.VideoCapture(0)

frame_count = 0
last_label = "Scanning..."
last_color = (255, 255, 255)
last_query_time = 0
prev_frame_time = 0
fps = 0

# Cache last detected face box for smoother display
last_box = None

print("\n[INFO] Starting face identification with MTCNN (press Q to quit)")
print("[INFO] No Student ID required\n")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # FPS calculation
    current_time = time.time()
    fps = 1 / (current_time - prev_frame_time) if prev_frame_time > 0 else 0
    prev_frame_time = current_time

    # Resize for speed
    frame = cv2.resize(frame, (720, 480))

    h, w, _ = frame.shape
    frame_count += 1

    # Only run MTCNN detection on certain frames (it's slower than MediaPipe)
    if frame_count % FRAME_SKIP == 0:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = detector.detect_faces(rgb)

        if results:
            face_data = results[0]
            x, y, bw, bh = face_data['box']

            # Ensure coordinates are valid
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(w, x + bw)
            y2 = min(h, y + bh)

            last_box = (x1, y1, x2, y2)

            face = frame[y1:y2, x1:x2]

            # Run embedding and query
            if (
                face.size > 0
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
        else:
            last_box = None

    # Draw last known bounding box
    if last_box:
        x1, y1, x2, y2 = last_box
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

    cv2.imshow("Face Identification (MTCNN)", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()