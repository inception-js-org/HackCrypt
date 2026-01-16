import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from concurrent.futures import ThreadPoolExecutor

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

router = APIRouter()

# Initialize embedder once (not per request)
embedder = FaceEmbedder()

# Thread pool for parallel Pinecone queries
executor = ThreadPoolExecutor(max_workers=5)

MATCH_THRESHOLD = 0.55


def query_face(embedding_list):
    """Query Pinecone for a single face"""
    return index.query(
        vector=embedding_list,
        top_k=1,
        include_metadata=True
    )


@router.post("/")
async def identify_student(image: UploadFile = File(...)):
    """
    Identify student(s) from an uploaded image.
    Supports multiple face detection.
    Uses InsightFace (ArcFace) for face detection and embedding.
    """
    # Validate file type
    if not image.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Please provide a JPEG or PNG image")
    
    # Read image from upload
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not read image")
    
    # Detect faces using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        return {
            "status": "no_face",
            "faces_detected": 0,
            "identities": []
        }
    
    # Process all faces
    embeddings = []
    bboxes = []
    
    h, w = frame.shape[:2]
    
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
        
        # Convert numpy types to Python native types
        bboxes.append({
            "x1": int(x1),
            "y1": int(y1),
            "x2": int(x2),
            "y2": int(y2),
            "confidence": float(round(face_data.det_score, 2))
        })
    
    # Parallel queries to Pinecone
    results = list(executor.map(query_face, embeddings))
    
    # Process results
    identities = []
    for i, result in enumerate(results):
        identity = "Unknown"
        score = 0.0
        
        if result["matches"]:
            match = result["matches"][0]
            score = float(match["score"])
            
            if score >= MATCH_THRESHOLD:
                identity = str(match["id"])
        
        identities.append({
            "identity": identity,
            "confidence": float(round(score, 3)),
            "bbox": bboxes[i],
            "matched": bool(score >= MATCH_THRESHOLD)
        })
    
    return {
        "status": "success",
        "faces_detected": int(len(faces)),
        "identities": identities
    }


@router.post("/webcam")
def identify_student_webcam():
    """
    Identify student(s) from webcam capture.
    Supports multiple face detection.
    Uses InsightFace (ArcFace) for face detection and embedding.
    """
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        raise HTTPException(status_code=500, detail="Could not open webcam")
    
    identities = []
    
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=500, detail="Could not capture frame from webcam")
    
    # Resize for consistency
    frame = cv2.resize(frame, (720, 480))
    h, w = frame.shape[:2]
    
    # Detect faces using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        return {
            "status": "no_face",
            "faces_detected": 0,
            "identities": []
        }
    
    # Process all faces
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
        
        # Convert numpy types to Python native types
        bboxes.append({
            "x1": int(x1),
            "y1": int(y1),
            "x2": int(x2),
            "y2": int(y2),
            "confidence": float(round(face_data.det_score, 2))
        })
    
    # Parallel queries to Pinecone
    results = list(executor.map(query_face, embeddings))
    
    # Process results
    for i, result in enumerate(results):
        identity = "Unknown"
        score = 0.0
        
        if result["matches"]:
            match = result["matches"][0]
            score = float(match["score"])
            
            if score >= MATCH_THRESHOLD:
                identity = str(match["id"])
        
        identities.append({
            "identity": identity,
            "confidence": float(round(score, 3)),
            "bbox": bboxes[i],
            "matched": bool(score >= MATCH_THRESHOLD)
        })
    
    return {
        "status": "success",
        "faces_detected": int(len(faces)),
        "identities": identities
    }
