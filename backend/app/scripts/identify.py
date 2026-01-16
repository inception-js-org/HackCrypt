import cv2
import time
import numpy as np
from concurrent.futures import ThreadPoolExecutor

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- PERFORMANCE CONFIG ----------
FRAME_SKIP = 10          # Run recognition every N frames
QUERY_COOLDOWN = 2.0     # Seconds to wait before re-querying Pinecone
MATCH_THRESHOLD = 0.55   # Minimum score for a match

# ---------- INIT ----------
embedder = FaceEmbedder()
cap = cv2.VideoCapture(0)

frame_count = 0
last_query_time = 0
prev_frame_time = 0
fps = 0

# Store multiple faces: list of dicts with bbox, label, color
detected_faces = []

def query_face(embedding_list):
    """Query Pinecone for a single face"""
    return index.query(
        vector=embedding_list,
        top_k=1,
        include_metadata=True
    )

print("\n[INFO] Starting face identification (press Q to quit)")
print("[INFO] Using ArcFace (InsightFace) for recognition")
print("[INFO] Multiple face detection enabled\n")

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

    # Run face detection and recognition
    should_process = (
        frame_count % FRAME_SKIP == 0
        and time.time() - last_query_time > QUERY_COOLDOWN
    )

    if should_process:
        # InsightFace detection + embedding in one call
        faces = embedder.app.get(frame)
        
        # Clear previous detections
        detected_faces = []

        if len(faces) > 0:
            embeddings = []
            bboxes = []
            
            for face_data in faces:
                # Extract bounding box
                bbox = face_data.bbox.astype(int)
                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
                
                # Ensure bounds are valid
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)

                # Get normalized embedding
                embedding = face_data.embedding / np.linalg.norm(face_data.embedding)
                embeddings.append(embedding.tolist())
                bboxes.append((x1, y1, x2, y2))
            
            # Parallel queries
            with ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(query_face, embeddings))
            
            # Process results for this face
            for i, result in enumerate(results):
                if result["matches"]:
                    match = result["matches"][0]
                    score = match["score"]

                    if score >= MATCH_THRESHOLD:
                        label = f"{match['id']} ({score:.2f})"
                        color = (0, 255, 0)  # Green for matched
                    else:
                        label = f"Unknown ({score:.2f})"
                        color = (0, 0, 255)  # Red for unknown
                else:
                    label = "Unknown"
                    color = (0, 0, 255)

                # Store this face's data
                detected_faces.append({
                    "bbox": bboxes[i],
                    "label": label,
                    "color": color
                })

            last_query_time = time.time()
        else:
            detected_faces = []

    # Draw all detected faces
    for face in detected_faces:
        x1, y1, x2, y2 = face["bbox"]
        label = face["label"]
        color = face["color"]
        
        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        
        # Draw label background
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
        cv2.rectangle(frame, (x1, y1 - 25), (x1 + label_size[0] + 10, y1), color, -1)
        
        # Draw label text
        cv2.putText(
            frame,
            label,
            (x1 + 5, y1 - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )

    # Display face count
    cv2.putText(
        frame,
        f"Faces: {len(detected_faces)}",
        (30, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
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

    cv2.imshow("Face Identification - ArcFace (Multi-Face)", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
