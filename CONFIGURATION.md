# HackCrypt Attendance System - Configuration

## Recognition Settings

### Confidence Thresholds
- `CONFIDENCE_THRESHOLD = 0.55` - Minimum similarity score to consider a match
- `MIN_DETECTION_SCORE = 0.85` - Minimum face detection confidence
- `MIN_FACE_SIZE = 80` - Minimum face size in pixels

### Verification & Duplicate Prevention
- `VERIFICATION_COUNT = 3` - Number of consistent detections required before marking attendance
- `COOLDOWN_SECONDS = 600` - Cooldown period (10 minutes) to prevent duplicate entries

## Performance Settings

### Frame Processing
- `FRAME_CAPTURE_INTERVAL = 2.0` - Capture and process frame every 2 seconds
- `VIDEO_FPS = 30` - Target FPS for smooth video display
- `VIDEO_WIDTH = 1280` - Ideal camera resolution width
- `VIDEO_HEIGHT = 720` - Ideal camera resolution height

### GPU Configuration
- `GPU_BATCH_SIZE = 5` - Number of frames to process in batch on GPU
- Uses `CUDAExecutionProvider` for NVIDIA GPU acceleration
- Automatically falls back to CPU if GPU not available

### Cache Settings
- `CACHE_SYNC_INTERVAL = 3600` - Sync cache with Pinecone every hour (3600 seconds)
- Cache file: `embeddings_cache.json` in backend root
- Cache queries first, Pinecone as fallback

## File Structure

### Backend Files
- `app/services/embedding_cache.py` - Local vector cache with cosine similarity search
- `app/services/face_embedding.py` - GPU-accelerated face detection and embedding
- `app/core/startup.py` - Initialization: GPU check, model warmup, cache sync
- `app/api/identify.py` - Face identification endpoint with cache-first lookup
- `app/main.py` - FastAPI app with verification buffer and startup events

### Frontend Files
- `components/attendance-camera.tsx` - Browser-native camera with 30 FPS display
- `app/teacher/timetable/page.tsx` - Attendance interface using camera component

## API Endpoints

### Face Identification
- `POST /identify/` - Identify faces from uploaded image
  - Form data: `file` (image), `session_id` (optional)
  - Returns: List of detected faces with bounding boxes and identifications
  
- `POST /identify/webcam` - Identify faces from webcam capture
  - Returns: Same as above

### Health Check
- `GET /health` - System status and statistics
  - Returns: GPU status, cache stats, active sessions

## Expected Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Video FPS | 30 | Smooth display without stuttering |
| Detection latency | <100ms | With GPU acceleration |
| Recognition latency | <50ms | Using local cache |
| Cache hit rate | >90% | Most queries from cache |
| GPU utilization | 40-60% | During active recognition |
| False positive rate | <1% | With 3-detection verification |

## Startup Sequence

1. **GPU Verification** - Check CUDA availability and log device info
2. **Model Initialization** - Load InsightFace models with GPU provider
3. **Model Warmup** - Run dummy inference to load models into GPU memory
4. **Cache Sync** - Fetch all embeddings from Pinecone to local cache
5. **Ready** - System ready for face recognition

## Verification Buffer Logic

### How It Works
1. Face detected → Extract embedding
2. Query local cache first (fast)
3. If cache miss → Query Pinecone (fallback)
4. If match found → Add to verification buffer
5. After 3 consistent detections → Check cooldown
6. If no recent attendance → Mark attendance
7. Clear buffer for that student

### Anti-Duplicate Protection
- Session-based tracking: Students tracked per session
- Cooldown enforcement: 10-minute minimum between marks
- Buffer clearing: Prevents re-marking same student

## Troubleshooting

### GPU Not Being Used
1. Check `nvidia-smi` in terminal
2. Verify PyTorch CUDA installation: `pip install torch --index-url https://download.pytorch.org/whl/cu118`
3. Check startup logs for GPU detection

### Cache Not Working
1. Check `embeddings_cache.json` exists in backend root
2. Verify Pinecone connection during startup
3. Check logs for "Cache hit" vs "Pinecone fallback" messages

### Video Stuttering
1. Ensure `FRAME_CAPTURE_INTERVAL` is 2.0+ seconds
2. Check GPU utilization (should be 40-60%)
3. Reduce `VERIFICATION_COUNT` if too many frames queued

### Duplicate Attendance Entries
1. Verify `COOLDOWN_SECONDS` is set to 600
2. Check `marked_students` dictionary is being maintained
3. Review verification buffer logic in logs

## Environment Variables

Add to `.env` file in backend:

```env
# Pinecone
PINECONE_API_KEY=your_api_key
PINECONE_INDEX_NAME=your_index_name

# GPU (optional)
CUDA_VISIBLE_DEVICES=0  # Use first GPU

# Logging
LOG_LEVEL=INFO
```

## Installation Requirements

### Backend
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install insightface onnxruntime-gpu fastapi uvicorn opencv-python numpy pinecone-client
```

### Frontend
```bash
npm install
```

## Running the System

### Backend
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```

## Monitoring

### Check GPU Usage
```bash
nvidia-smi -l 1  # Update every second
```

### Check Cache Stats
```bash
curl http://localhost:8000/health
```

### View Logs
Backend logs will show:
- GPU detection results
- Cache hits/misses
- Verification buffer activity
- Attendance marking events
