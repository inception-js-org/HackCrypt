import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor
import threading
import time
import logging

from app.core.startup import get_embedder
from app.services.embedding_cache import embedding_cache
from app.core.pinecone_client import index

logger = logging.getLogger(__name__)

router = APIRouter()

# Thread pool for parallel Pinecone queries
executor = ThreadPoolExecutor(max_workers=5)

# Lock for webcam access to prevent concurrent access conflicts
webcam_lock = threading.Lock()

MATCH_THRESHOLD = 0.55


def query_face_with_cache(embedding):
    """
    Query for face match using local cache first, Pinecone as fallback.
    
    Args:
        embedding: Face embedding vector (as numpy array or list)
        
    Returns:
        dict with matched student_id, score, and metadata
    """
    # Convert to numpy array if needed
    if isinstance(embedding, list):
        embedding = np.array(embedding, dtype=np.float32)
    
    # Try local cache first
    cache_results = embedding_cache.search(embedding, top_k=1, threshold=MATCH_THRESHOLD)
    
    if cache_results is not None and len(cache_results) > 0:
        # Cache hit!
        logger.info(f"Cache hit: Found match with score {cache_results[0]['score']:.3f}")
        return {
            'student_id': cache_results[0]['student_id'],
            'score': cache_results[0]['score'],
            'metadata': cache_results[0]['metadata'],
            'source': 'cache'
        }
    
    # Cache miss - fallback to Pinecone
    logger.info("Cache miss, querying Pinecone...")
    
    try:
        result = index.query(
            vector=embedding.tolist() if isinstance(embedding, np.ndarray) else embedding,
            top_k=1,
            include_metadata=True
        )
        
        if result["matches"] and len(result["matches"]) > 0:
            match = result["matches"][0]
            score = float(match["score"])
            
            if score >= MATCH_THRESHOLD:
                return {
                    'student_id': str(match["id"]),
                    'score': score,
                    'metadata': match.get("metadata", {}),
                    'source': 'pinecone'
                }
        
        # No match found
        return {
            'student_id': None,
            'score': 0.0,
            'metadata': {},
            'source': 'none'
        }
        
    except Exception as e:
        logger.error(f"Error querying Pinecone: {e}")
        return {
            'student_id': None,
            'score': 0.0,
            'metadata': {},
            'source': 'error'
        }


@router.post("/")
async def identify_student(
    file: UploadFile = File(...),
    session_id: Optional[int] = Form(None)
):
    """
    Identify student(s) from an uploaded image.
    Supports multiple face detection.
    Uses InsightFace (ArcFace) for face detection and embedding.
    Queries local cache first, then Pinecone as fallback.
    
    Args:
        file: Image file to process
        session_id: Optional session ID for attendance tracking
        
    Returns:
        JSON with detected faces, bounding boxes, and identifications
    """
    # Get embedder instance
    embedder = get_embedder()
    
    # Validate file type
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Please provide a JPEG or PNG image")
    
    # Read image from upload
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not read image")
    
    # Detect faces using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        return {
            "status": "no_face",
            "faces": [],
            "timestamp": time.time()
        }
    
    # Process all faces
    results = []
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
        
        # Query with cache
        match_result = query_face_with_cache(embedding)
        
        # Build response
        face_result = {
            "bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],  # [x, y, width, height]
            "detection_score": float(round(face_data.det_score, 3))
        }
        
        if match_result['student_id']:
            face_result["student_id"] = match_result['student_id']
            face_result["confidence"] = float(round(match_result['score'], 3))
            face_result["name"] = match_result['metadata'].get('name', 'Unknown')
            face_result["source"] = match_result['source']
        
        results.append(face_result)
    
    return {
        "status": "success",
        "faces": results,
        "timestamp": time.time()
    }


@router.post("/webcam")
def identify_student_webcam():
    """
    Identify student(s) from webcam capture.
    Supports multiple face detection.
    Uses InsightFace (ArcFace) for face detection and embedding.
    Queries local cache first, then Pinecone as fallback.
    """
    # Get embedder instance
    embedder = get_embedder()
    
    # Use lock to prevent concurrent webcam access
    lock_acquired = webcam_lock.acquire(timeout=5.0)
    if not lock_acquired:
        raise HTTPException(status_code=503, detail="Webcam is busy, please try again")
    
    cap = None
    try:
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Use DirectShow backend on Windows
        
        if not cap.isOpened():
            raise HTTPException(status_code=500, detail="Could not open webcam")
        
        # Give webcam time to initialize
        time.sleep(0.1)
        
        frame = None
        
        # Retry logic for grabbing frame
        for attempt in range(3):
            ret, frame = cap.read()
            if ret and frame is not None:
                break
            time.sleep(0.1)
        
        if frame is None:
            raise HTTPException(status_code=500, detail="Could not capture frame from webcam")
    finally:
        if cap is not None:
            cap.release()
        webcam_lock.release()
    
    # Resize for consistency
    frame = cv2.resize(frame, (720, 480))
    h, w = frame.shape[:2]
    
    # Detect faces using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        return {
            "status": "no_face",
            "faces": [],
            "timestamp": time.time()
        }
    
    # Process all faces
    results = []
    
    for face_data in faces:
        # Extract bounding box
        bbox = face_data.bbox.astype(int)
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        
        # Ensure bounds are valid
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        # Get normalized embedding
        embedding = face_data.embedding / np.linalg.norm(face_data.embedding)
        
        # Query with cache
        match_result = query_face_with_cache(embedding)
        
        # Build response
        face_result = {
            "bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],  # [x, y, width, height]
            "detection_score": float(round(face_data.det_score, 3))
        }
        
        if match_result['student_id']:
            face_result["student_id"] = match_result['student_id']
            face_result["confidence"] = float(round(match_result['score'], 3))
            face_result["name"] = match_result['metadata'].get('name', 'Unknown')
            face_result["source"] = match_result['source']
        
        results.append(face_result)
    
    return {
        "status": "success",
        "faces": results,
        "timestamp": time.time()
    }
