import cv2
import mediapipe as mp
from fastapi import APIRouter

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

router = APIRouter()

@router.post("/")
def identify_student():
    embedder = FaceEmbedder()
    mp_face = mp.solutions.face_detection
    cap = cv2.VideoCapture(0)

    identity = "Unknown"
    confidence = 0.0

    with mp_face.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.6
    ) as detector:

        ret, frame = cap.read()
        if ret:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = detector.process(rgb)

            if results.detections:
                bbox = results.detections[0].location_data.relative_bounding_box
                h, w, _ = frame.shape

                x1 = max(0, int(bbox.xmin * w))
                y1 = max(0, int(bbox.ymin * h))
                x2 = min(w, x1 + int(bbox.width * w))
                y2 = min(h, y1 + int(bbox.height * h))

                face = frame[y1:y2, x1:x2]

                if face.size > 0:
                    emb = embedder.embed(face).tolist()

                    result = index.query(vector=emb, top_k=1)

                    if result["matches"]:
                        match = result["matches"][0]
                        confidence = match["score"]

                        if confidence >= 0.55:
                            identity = match["id"]

    cap.release()

    return {
        "identity": identity,
        "confidence": round(confidence, 3)
    }
