"""
Video Attendance API
====================
Endpoint for processing uploaded videos and marking attendance.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import tempfile
import os
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import psycopg2
from psycopg2.extras import RealDictCursor

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index
from app.services.embedding_cache import embedding_cache

router = APIRouter()

# Configuration
FRAME_SKIP = 5
MATCH_THRESHOLD = 0.55
MAX_WORKERS = 5
MIN_FACE_CONFIDENCE = 0.6

# Database connection string (from your .env)
DATABASE_URL = "postgresql://neondb_owner:npg_caWN5sQK3MeU@ep-hidden-mode-ah86jidk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Thread pool for Pinecone queries
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

# Global embedder (will be initialized on first use)
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = FaceEmbedder()
    return _embedder


def query_face(embedding_list):
    """Query Pinecone for a single face"""
    try:
        # Try cache first
        embedding_np = np.array(embedding_list)
        cache_result = embedding_cache.search(embedding_np, top_k=1, threshold=MATCH_THRESHOLD)
        
        if cache_result and len(cache_result) > 0:
            return {
                "matches": [{
                    "id": cache_result[0]['student_id'],
                    "score": cache_result[0]['score']
                }],
                "source": "cache"
            }
        
        # Fall back to Pinecone
        result = index.query(
            vector=embedding_list,
            top_k=1,
            include_metadata=True
        )
        return {"matches": result.get("matches", []), "source": "pinecone"}
    except Exception as e:
        print(f"[ERROR] Query failed: {e}")
        return {"matches": [], "source": "error"}


def get_student_names(student_ids: list) -> dict:
    """
    Fetch student names from database given a list of student IDs.
    Returns a dictionary mapping student_id -> {first_name, last_name}
    """
    if not student_ids:
        return {}
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Query to get student names
        cursor.execute(
            """
            SELECT id, first_name, last_name 
            FROM students 
            WHERE id = ANY(%s)
            """,
            (student_ids,)
        )
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Convert to dictionary for easy lookup
        name_map = {}
        for row in results:
            name_map[str(row['id'])] = {
                'first_name': row['first_name'] or '',
                'last_name': row['last_name'] or ''
            }
        
        print(f"[INFO] Fetched names for {len(name_map)} students")
        return name_map
        
    except Exception as e:
        print(f"[ERROR] Failed to fetch student names: {e}")
        return {}


@router.post("/analyze")
async def analyze_video_attendance(
    video: UploadFile = File(...),
    session_id: int = Form(...),
    class_id: int = Form(...)
):
    """
    Analyze uploaded video for face recognition and return detected students.
    
    Args:
        video: Uploaded video file
        session_id: Session ID for attendance
        class_id: Class ID to filter students
        
    Returns:
        List of detected students with confidence scores and names
    """
    embedder = get_embedder()
    
    # Validate file type
    if not video.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: mp4, avi, mov, mkv, webm")
    
    # Save uploaded video to temp file
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            content = await video.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        print(f"[INFO] Processing video: {video.filename} for session {session_id}")
        
        # Open video
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")
        
        # Get video info
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"[INFO] Video: {total_frames} frames, {fps:.1f} FPS")
        
        # Track detections per student
        student_detections = defaultdict(lambda: {
            "confidences": [],
            "first_seen_frame": None,
            "last_seen_frame": None
        })
        
        frame_count = 0
        processed_count = 0
        start_time = time.time()
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Process every N frames
            if frame_count % FRAME_SKIP != 0:
                continue
            
            processed_count += 1
            
            try:
                # Detect faces
                faces = embedder.app.get(frame)
                
                for face in faces:
                    if face.det_score < MIN_FACE_CONFIDENCE:
                        continue
                    
                    # Get normalized embedding
                    embedding = face.embedding / np.linalg.norm(face.embedding)
                    
                    # Query for identity
                    result = query_face(embedding.tolist())
                    
                    if result["matches"]:
                        match = result["matches"][0]
                        score = float(match.get("score", 0))
                        
                        if score >= MATCH_THRESHOLD:
                            student_id = str(match["id"])
                            
                            # Update tracking
                            student_detections[student_id]["confidences"].append(score)
                            if student_detections[student_id]["first_seen_frame"] is None:
                                student_detections[student_id]["first_seen_frame"] = frame_count
                            student_detections[student_id]["last_seen_frame"] = frame_count
                            
            except Exception as e:
                print(f"[WARN] Frame {frame_count} processing error: {e}")
                continue
        
        cap.release()
        
        elapsed_time = time.time() - start_time
        print(f"[INFO] Processed {processed_count} frames in {elapsed_time:.2f}s")
        
        # Build results - require at least 2 detections for reliability
        MIN_DETECTIONS = 2
        detected_students = []
        
        for student_id, data in student_detections.items():
            if len(data["confidences"]) >= MIN_DETECTIONS:
                avg_confidence = np.mean(data["confidences"])
                detected_students.append({
                    "student_id": student_id,
                    "detection_count": len(data["confidences"]),
                    "average_confidence": round(float(avg_confidence), 3),
                    "max_confidence": round(float(max(data["confidences"])), 3),
                    "first_seen_frame": data["first_seen_frame"],
                    "last_seen_frame": data["last_seen_frame"],
                    "first_seen_seconds": round(data["first_seen_frame"] / fps, 2),
                    "last_seen_seconds": round(data["last_seen_frame"] / fps, 2)
                })
        
        # Sort by confidence
        detected_students.sort(key=lambda x: x["average_confidence"], reverse=True)
        
        # Fetch student names from database
        student_ids = [int(s["student_id"]) for s in detected_students]
        name_map = get_student_names(student_ids)
        
        # Add names to detected students
        for student in detected_students:
            student_info = name_map.get(student["student_id"], {})
            student["first_name"] = student_info.get("first_name", "")
            student["last_name"] = student_info.get("last_name", "")
        
        print(f"[INFO] Detected {len(detected_students)} unique students")
        for s in detected_students:
            print(f"  • ID: {s['student_id']} - {s['first_name']} {s['last_name']} (Conf: {s['average_confidence']:.2f})")
        
        return {
            "success": True,
            "session_id": session_id,
            "class_id": class_id,
            "video_info": {
                "filename": video.filename,
                "total_frames": total_frames,
                "fps": fps,
                "duration_seconds": round(total_frames / fps, 2),
                "frames_processed": processed_count
            },
            "processing_time_seconds": round(elapsed_time, 2),
            "detected_students": detected_students,
            "total_detected": len(detected_students)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Video analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")
    finally:
        # Clean up temp file
        if temp_file and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass