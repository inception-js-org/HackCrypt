"""
Video Face Recognition Script
=============================
Analyzes a video file, detects faces using RetinaFace (InsightFace),
generates embeddings, matches with Pinecone, and outputs results to JSON.

Usage:
    python -m app.scripts.analyze_video

Tech Stack:
    - RetinaFace (InsightFace) for face detection
    - ArcFace (InsightFace) for face embeddings
    - Pinecone for vector matching
"""

import cv2
import time
import json
import numpy as np
import os
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict

from app.services.face_embedding import FaceEmbedder
from app.core.pinecone_client import index

# ---------- CONFIG ----------
FRAME_SKIP = 5              # Process every N frames (adjust based on video FPS)
MATCH_THRESHOLD = 0.55       # Minimum score for a match
MAX_WORKERS = 5              # Parallel Pinecone queries
MIN_FACE_CONFIDENCE = 0.6    # Minimum face detection confidence
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"

# ---------- INIT ----------
embedder = FaceEmbedder()
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)


def query_face(embedding_list):
    """Query Pinecone for a single face"""
    try:
        return index.query(
            vector=embedding_list,
            top_k=1,
            include_metadata=True
        )
    except Exception as e:
        print(f"[ERROR] Pinecone query failed: {e}")
        return {"matches": []}


def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS.mmm format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def extract_video_info(cap):
    """Extract video metadata"""
    return {
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "duration_seconds": cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
    }


def process_frame(frame, frame_number, fps):
    """
    Process a single frame: detect faces, generate embeddings, match with Pinecone.
    
    Returns:
        List of detected faces with identity info
    """
    h, w, _ = frame.shape
    timestamp = frame_number / fps
    
    # Detect faces using InsightFace
    faces = embedder.app.get(frame)
    
    if len(faces) == 0:
        return []
    
    # Prepare embeddings and bounding boxes
    embeddings = []
    face_data_list = []
    
    for face_data in faces:
        # Skip low confidence detections
        if face_data.det_score < MIN_FACE_CONFIDENCE:
            continue
        
        # Extract bounding box
        bbox = face_data.bbox.astype(int)
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        
        # Ensure bounds are valid
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        # Get normalized embedding
        embedding = face_data.embedding / np.linalg.norm(face_data.embedding)
        embeddings.append(embedding.tolist())
        
        face_data_list.append({
            "bbox": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
            "detection_confidence": float(round(face_data.det_score, 3))
        })
    
    if len(embeddings) == 0:
        return []
    
    # Parallel Pinecone queries
    results = list(executor.map(query_face, embeddings))
    
    # Process results
    frame_faces = []
    for i, result in enumerate(results):
        identity = "Unknown"
        match_score = 0.0
        matched = False
        
        if result["matches"]:
            match = result["matches"][0]
            match_score = float(match["score"])
            
            if match_score >= MATCH_THRESHOLD:
                identity = str(match["id"])
                matched = True
        
        frame_faces.append({
            "identity": identity,
            "match_score": round(match_score, 3),
            "matched": matched,
            "bbox": face_data_list[i]["bbox"],
            "detection_confidence": face_data_list[i]["detection_confidence"],
            "frame_number": frame_number,
            "timestamp": format_timestamp(timestamp),
            "timestamp_seconds": round(timestamp, 3)
        })
    
    return frame_faces


def analyze_video(video_path: str, output_annotated: bool = False):
    """
    Main function to analyze a video file.
    
    Args:
        video_path: Path to the video file
        output_annotated: If True, save an annotated video with bounding boxes
    
    Returns:
        Dict containing analysis results
    """
    video_path = Path(video_path)
    
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")
    
    print(f"\n{'='*60}")
    print(f"VIDEO FACE RECOGNITION ANALYSIS")
    print(f"{'='*60}")
    print(f"[INFO] Video: {video_path.name}")
    print(f"[INFO] Using RetinaFace for detection, ArcFace for embeddings")
    print(f"[INFO] Match threshold: {MATCH_THRESHOLD}")
    print(f"[INFO] Processing every {FRAME_SKIP} frames")
    print(f"{'='*60}\n")
    
    # Open video
    cap = cv2.VideoCapture(str(video_path))
    
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    # Get video info
    video_info = extract_video_info(cap)
    fps = video_info["fps"]
    total_frames = video_info["total_frames"]
    
    print(f"[INFO] Resolution: {video_info['width']}x{video_info['height']}")
    print(f"[INFO] FPS: {fps:.2f}")
    print(f"[INFO] Duration: {format_timestamp(video_info['duration_seconds'])}")
    print(f"[INFO] Total frames: {total_frames}")
    print(f"[INFO] Frames to process: ~{total_frames // FRAME_SKIP}\n")
    
    # Prepare annotated video writer (if enabled)
    annotated_writer = None
    if output_annotated:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_video_path = OUTPUT_DIR / f"annotated_{video_path.stem}.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        annotated_writer = cv2.VideoWriter(
            str(output_video_path),
            fourcc,
            fps,
            (video_info["width"], video_info["height"])
        )
        print(f"[INFO] Annotated video will be saved to: {output_video_path}\n")
    
    # Analysis results
    all_detections = []
    people_appearances = defaultdict(list)  # {identity: [timestamps]}
    frame_count = 0
    processed_count = 0
    start_time = time.time()
    last_faces = []  # For drawing on skipped frames
    
    print("[PROCESSING] Starting video analysis...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Process every N frames
        if frame_count % FRAME_SKIP == 0:
            processed_count += 1
            
            # Process frame
            frame_faces = process_frame(frame, frame_count, fps)
            last_faces = frame_faces
            
            # Store detections
            for face in frame_faces:
                all_detections.append(face)
                people_appearances[face["identity"]].append({
                    "timestamp": face["timestamp"],
                    "timestamp_seconds": face["timestamp_seconds"],
                    "frame": face["frame_number"],
                    "confidence": face["match_score"]
                })
            
            # Progress update
            progress = (frame_count / total_frames) * 100
            elapsed = time.time() - start_time
            eta = (elapsed / frame_count) * (total_frames - frame_count) if frame_count > 0 else 0
            
            print(f"\r[PROGRESS] {progress:.1f}% | Frame {frame_count}/{total_frames} | "
                  f"Faces in frame: {len(frame_faces)} | ETA: {format_timestamp(eta)}", end="")
        
        # Draw annotations on frame (for video output)
        if output_annotated and annotated_writer:
            for face in last_faces:
                bbox = face["bbox"]
                color = (0, 255, 0) if face["matched"] else (0, 0, 255)
                
                # Draw bounding box
                cv2.rectangle(
                    frame,
                    (bbox["x1"], bbox["y1"]),
                    (bbox["x2"], bbox["y2"]),
                    color, 2
                )
                
                # Draw label
                label = f"{face['identity']} ({face['match_score']:.2f})"
                label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                cv2.rectangle(
                    frame,
                    (bbox["x1"], bbox["y1"] - 25),
                    (bbox["x1"] + label_size[0] + 10, bbox["y1"]),
                    color, -1
                )
                cv2.putText(
                    frame, label,
                    (bbox["x1"] + 5, bbox["y1"] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (255, 255, 255), 2
                )
            
            annotated_writer.write(frame)
    
    # Cleanup
    cap.release()
    if annotated_writer:
        annotated_writer.release()
    
    elapsed_time = time.time() - start_time
    
    print(f"\n\n[COMPLETE] Processed {processed_count} frames in {format_timestamp(elapsed_time)}")
    
    # Generate summary
    people_summary = {}
    for identity, appearances in people_appearances.items():
        if identity == "Unknown":
            continue
        
        timestamps = [a["timestamp_seconds"] for a in appearances]
        people_summary[identity] = {
            "total_appearances": len(appearances),
            "first_seen": format_timestamp(min(timestamps)),
            "last_seen": format_timestamp(max(timestamps)),
            "first_seen_seconds": min(timestamps),
            "last_seen_seconds": max(timestamps),
            "duration_in_video": round(max(timestamps) - min(timestamps), 3),
            "average_confidence": round(sum(a["confidence"] for a in appearances) / len(appearances), 3),
            "appearances": appearances
        }
    
    # Unknown faces count
    unknown_count = len([d for d in all_detections if d["identity"] == "Unknown"])
    
    # Final results
    results = {
        "analysis_info": {
            "video_file": str(video_path.name),
            "video_path": str(video_path.absolute()),
            "analysis_date": datetime.now().isoformat(),
            "processing_time_seconds": round(elapsed_time, 2),
            "processing_time_formatted": format_timestamp(elapsed_time)
        },
        "video_info": video_info,
        "processing_config": {
            "frame_skip": FRAME_SKIP,
            "match_threshold": MATCH_THRESHOLD,
            "min_face_confidence": MIN_FACE_CONFIDENCE,
            "frames_processed": processed_count
        },
        "summary": {
            "total_detections": len(all_detections),
            "unique_people_identified": len(people_summary),
            "unknown_faces": unknown_count,
            "people_list": list(people_summary.keys())
        },
        "people": people_summary,
        "all_detections": all_detections
    }
    
    # Save JSON output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_json_path = OUTPUT_DIR / f"analysis_{video_path.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n[OUTPUT] Results saved to: {output_json_path}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("ANALYSIS SUMMARY")
    print(f"{'='*60}")
    print(f"Total face detections: {len(all_detections)}")
    print(f"Unique people identified: {len(people_summary)}")
    print(f"Unknown faces: {unknown_count}")
    print(f"\nPeople found in video:")
    for identity, data in people_summary.items():
        print(f"  • {identity}")
        print(f"      Appearances: {data['total_appearances']}")
        print(f"      First seen: {data['first_seen']}")
        print(f"      Last seen: {data['last_seen']}")
        print(f"      Avg confidence: {data['average_confidence']}")
    print(f"{'='*60}\n")
    
    return results


def main():
    """Interactive main function"""
    print("\n" + "="*60)
    print("VIDEO FACE RECOGNITION - STANDALONE SCRIPT")
    print("="*60 + "\n")
    
    # Get video path
    video_path = input("Enter path to video file: ").strip('"').strip("'")
    
    # Ask about annotated output
    annotate = input("Generate annotated video with bounding boxes? (y/n): ").strip().lower()
    output_annotated = annotate in ['y', 'yes']
    
    try:
        results = analyze_video(video_path, output_annotated)
        print("\n✅ Analysis complete!")
        return results
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
    except ValueError as e:
        print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()