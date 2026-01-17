"""
Video Attendance API
====================
Endpoint for processing uploaded videos and marking attendance.
Now includes annotated video output with bounding boxes.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import cv2
import numpy as np
import tempfile
import os
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
from datetime import datetime

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

# Output directory for annotated videos
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output" / "annotated_videos"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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
    class_id: int = Form(...),
    create_annotated: bool = Form(default=True)
):
    """
    Analyze uploaded video for face recognition and return detected students.
    
    Args:
        video: Uploaded video file
        session_id: Session ID for attendance
        class_id: Class ID to filter students
        create_annotated: Whether to create annotated video with bounding boxes
        
    Returns:
        List of detected students with confidence scores and names
    """
    embedder = get_embedder()
    
    # Validate file type
    if not video.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: mp4, avi, mov, mkv, webm")
    
    # Save uploaded video to temp file
    temp_file = None
    annotated_video_path = None
    annotated_writer = None
    
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
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"[INFO] Video: {total_frames} frames, {fps:.1f} FPS, {width}x{height}")
        
        # Prepare annotated video writer if requested
        if create_annotated:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            annotated_video_path = OUTPUT_DIR / f"session_{session_id}_{timestamp}.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            annotated_writer = cv2.VideoWriter(
                str(annotated_video_path),
                fourcc,
                fps,
                (width, height)
            )
            print(f"[INFO] Annotated video will be saved to: {annotated_video_path}")
        
        # Track detections per student
        student_detections = defaultdict(lambda: {
            "confidences": [],
            "first_seen_frame": None,
            "last_seen_frame": None
        })
        
        # Store frame-by-frame detections for annotation
        frame_detections = {}
        
        frame_count = 0
        processed_count = 0
        start_time = time.time()
        last_faces = []  # For drawing on skipped frames
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            current_faces = []
            
            # Process every N frames
            if frame_count % FRAME_SKIP == 0:
                processed_count += 1
                
                try:
                    # Detect faces
                    faces = embedder.app.get(frame)
                    
                    for face in faces:
                        if face.det_score < MIN_FACE_CONFIDENCE:
                            continue
                        
                        # Get bounding box
                        bbox = face.bbox.astype(int)
                        x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), min(width, bbox[2]), min(height, bbox[3])
                        
                        # Get normalized embedding
                        embedding = face.embedding / np.linalg.norm(face.embedding)
                        
                        # Query for identity
                        result = query_face(embedding.tolist())
                        
                        identity = "Unknown"
                        confidence = 0.0
                        matched = False
                        
                        if result["matches"]:
                            match = result["matches"][0]
                            score = float(match.get("score", 0))
                            
                            if score >= MATCH_THRESHOLD:
                                student_id = str(match["id"])
                                identity = student_id
                                confidence = score
                                matched = True
                                
                                # Update tracking
                                student_detections[student_id]["confidences"].append(score)
                                if student_detections[student_id]["first_seen_frame"] is None:
                                    student_detections[student_id]["first_seen_frame"] = frame_count
                                student_detections[student_id]["last_seen_frame"] = frame_count
                        
                        # Store face info for annotation
                        current_faces.append({
                            "bbox": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
                            "identity": identity,
                            "confidence": confidence,
                            "matched": matched,
                            "detection_score": float(face.det_score)
                        })
                    
                    last_faces = current_faces
                    
                except Exception as e:
                    print(f"[WARN] Frame {frame_count} processing error: {e}")
                    continue
            
            # Draw annotations on frame
            if annotated_writer:
                annotated_frame = frame.copy()
                faces_to_draw = current_faces if frame_count % FRAME_SKIP == 0 else last_faces
                
                for face_info in faces_to_draw:
                    bbox = face_info["bbox"]
                    identity = face_info["identity"]
                    confidence = face_info["confidence"]
                    matched = face_info["matched"]
                    
                    # Color: Green for matched, Red for unknown
                    color = (0, 255, 0) if matched else (0, 0, 255)
                    
                    # Draw bounding box
                    cv2.rectangle(
                        annotated_frame,
                        (bbox["x1"], bbox["y1"]),
                        (bbox["x2"], bbox["y2"]),
                        color, 2
                    )
                    
                    # Draw label background
                    label = f"{identity} ({confidence:.2f})" if matched else "Unknown"
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    
                    cv2.rectangle(
                        annotated_frame,
                        (bbox["x1"], bbox["y1"] - 25),
                        (bbox["x1"] + label_size[0] + 10, bbox["y1"]),
                        color, -1
                    )
                    
                    # Draw label text
                    cv2.putText(
                        annotated_frame, label,
                        (bbox["x1"] + 5, bbox["y1"] - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 2
                    )
                
                # Add frame counter
                cv2.putText(
                    annotated_frame,
                    f"Frame: {frame_count}/{total_frames}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (255, 255, 255), 2
                )
                
                # Add session info
                cv2.putText(
                    annotated_frame,
                    f"Session ID: {session_id}",
                    (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (255, 255, 255), 2
                )
                
                annotated_writer.write(annotated_frame)
        
        cap.release()
        if annotated_writer:
            annotated_writer.release()
        
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
        
        response_data = {
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
        
        # Add annotated video path if created
        if annotated_video_path and annotated_video_path.exists():
            response_data["annotated_video"] = {
                "path": str(annotated_video_path),
                "filename": annotated_video_path.name,
                "download_url": f"/api/video-attendance/download/{annotated_video_path.name}"
            }
            print(f"[INFO] Annotated video saved: {annotated_video_path}")
        
        return response_data
        
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


@router.get("/download/{filename}")
async def download_annotated_video(filename: str):
    """
    Download an annotated video file.
    
    Args:
        filename: Name of the annotated video file
        
    Returns:
        FileResponse with the video file
    """
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Annotated video not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=filename,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/list")
async def list_annotated_videos():
    """
    List all available annotated videos.
    
    Returns:
        List of annotated video files with metadata
    """
    try:
        videos = []
        for file_path in OUTPUT_DIR.glob("*.mp4"):
            stat = file_path.stat()
            videos.append({
                "filename": file_path.name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "download_url": f"/api/video-attendance/download/{file_path.name}"
            })
        
        # Sort by creation time (newest first)
        videos.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "success": True,
            "total_videos": len(videos),
            "videos": videos
        }
    except Exception as e:
        print(f"[ERROR] Failed to list videos: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list videos: {str(e)}")


@router.delete("/delete/{filename}")
async def delete_annotated_video(filename: str):
    """
    Delete an annotated video file.
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        Success message
    """
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    try:
        file_path.unlink()
        return {
            "success": True,
            "message": f"Deleted {filename}"
        }
    except Exception as e:
        print(f"[ERROR] Failed to delete video: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")