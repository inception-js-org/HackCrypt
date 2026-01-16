import cv2
import numpy as np
import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import tempfile

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

router = APIRouter()

# Initialize embedder once (not per request)
embedder = FaceEmbedder()

NUM_AUGMENTATIONS = 5

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


@router.post("/")
async def enroll_student(
    student_id: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Enroll a student using an uploaded image.
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
    
    # Detect face using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected in the image")
    
    # Get the largest face by bounding box area
    face_data = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    
    # Validate detection confidence
    if face_data.det_score < 0.5:
        raise HTTPException(status_code=400, detail=f"Face detection confidence too low: {float(face_data.det_score):.2f}")
    
    # Generate embeddings
    embeddings = []
    
    # First embedding from original detection (most accurate)
    embeddings.append(face_data.embedding / np.linalg.norm(face_data.embedding))
    
    # Generate embeddings from augmented versions
    for i in range(1, NUM_AUGMENTATIONS):
        augmented_frame = augment_image(frame.copy(), i)
        try:
            embedding = embedder.embed(augmented_frame)
            embeddings.append(embedding)
        except ValueError:
            # Skip failed augmentations
            pass
    
    if len(embeddings) < 2:
        raise HTTPException(status_code=400, detail="Not enough valid embeddings generated")
    
    # Average embeddings and normalize
    final_embedding = np.mean(embeddings, axis=0)
    final_embedding = (final_embedding / np.linalg.norm(final_embedding)).tolist()
    
    # Save to Pinecone
    index.upsert([
        (
            student_id,
            final_embedding,
            {"type": "student"}
        )
    ])
    
    return {
        "status": "success",
        "student_id": str(student_id),
        "detection_confidence": float(round(face_data.det_score, 2)),
        "embeddings_averaged": int(len(embeddings)),
        "embedding_dimension": 512
    }


@router.post("/webcam")
def enroll_student_webcam(student_id: str):
    """
    Enroll a student using webcam capture.
    Uses InsightFace (ArcFace) for face detection and embedding.
    """
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        raise HTTPException(status_code=500, detail="Could not open webcam")
    
    embeddings = []
    frame_count = 0
    max_frames = 100  # Timeout after 100 frames
    
    while len(embeddings) < NUM_AUGMENTATIONS and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Skip frames for variety
        if frame_count % 10 != 0:
            continue
        
        # Detect face using InsightFace
        faces = embedder.app.get(frame)
        
        if len(faces) > 0:
            # Get the largest face
            face_data = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            
            if face_data.det_score >= 0.6:
                embedding = face_data.embedding / np.linalg.norm(face_data.embedding)
                embeddings.append(embedding)
    
    cap.release()
    
    if len(embeddings) < 2:
        raise HTTPException(status_code=400, detail="Face capture incomplete - not enough samples")
    
    # Average embeddings and normalize
    final_embedding = np.mean(embeddings, axis=0)
    final_embedding = (final_embedding / np.linalg.norm(final_embedding)).tolist()
    
    # Save to Pinecone
    index.upsert([
        (
            student_id,
            final_embedding,
            {"type": "student"}
        )
    ])
    
    return {
        "status": "success",
        "student_id": str(student_id),
        "samples": int(len(embeddings)),
        "embedding_dimension": 512
    }
