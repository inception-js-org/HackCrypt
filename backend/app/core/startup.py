"""
Startup initialization for the attendance system.
Handles GPU verification, model warmup, and cache synchronization.
"""

import logging
import numpy as np
from app.services.face_embedding import FaceEmbedder
from app.services.embedding_cache import embedding_cache

logger = logging.getLogger(__name__)

# Global instances
embedder = None
pinecone_index = None

def check_gpu():
    """Verify GPU availability and configuration."""
    try:
        import torch
        
        if torch.cuda.is_available():
            logger.info("=" * 50)
            logger.info("GPU Configuration:")
            logger.info(f"  CUDA Available: Yes")
            logger.info(f"  Device Name: {torch.cuda.get_device_name(0)}")
            logger.info(f"  CUDA Version: {torch.version.cuda}")
            logger.info(f"  Device Count: {torch.cuda.device_count()}")
            logger.info(f"  Current Device: {torch.cuda.current_device()}")
            
            mem_allocated = torch.cuda.memory_allocated(0) / 1024**2
            mem_reserved = torch.cuda.memory_reserved(0) / 1024**2
            logger.info(f"  Memory Allocated: {mem_allocated:.2f} MB")
            logger.info(f"  Memory Reserved: {mem_reserved:.2f} MB")
            logger.info("=" * 50)
            return True
        else:
            logger.warning("GPU NOT AVAILABLE - Using CPU")
            return False
    except ImportError:
        logger.error("PyTorch not installed")
        return False
    except Exception as e:
        logger.error(f"Error checking GPU: {e}")
        return False

def warmup_models():
    """Warm up models by running dummy inference."""
    global embedder
    
    if embedder is None:
        return
        
    try:
        logger.info("Warming up face detection and embedding models...")
        dummy_frame = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        
        try:
            faces = embedder.app.get(dummy_frame)
            logger.info(f"Detection model warmed up (detected {len(faces)} faces)")
        except Exception as e:
            logger.warning(f"Detection warmup failed (expected): {e}")
            
    except Exception as e:
        logger.error(f"Error during model warmup: {e}")

async def on_startup():
    """Main startup initialization function."""
    global embedder, pinecone_index
    
    logger.info("🚀 STARTING HACKCRYPT ATTENDANCE SYSTEM")
    
    # 1. Check GPU
    gpu_available = check_gpu()
    
    # 2. Initialize face embedder
    embedder = FaceEmbedder(use_gpu=gpu_available)
    
    # 3. Warm up models
    warmup_models()
    
    # 4. Import pinecone after env is loaded and sync cache
    try:
        from app.core.pinecone_client import index as pi
        pinecone_index = pi
        num_cached = embedding_cache.sync_from_pinecone(pinecone_index)
        logger.info(f"✅ Cache synchronized: {num_cached} embeddings")
    except Exception as e:
        logger.error(f"❌ Error with Pinecone: {e}")
    
    logger.info("✅ STARTUP COMPLETE")

async def on_shutdown():
    """Cleanup on shutdown."""
    try:
        embedding_cache.save_cache()
        logger.info("✅ Cache saved")
    except Exception as e:
        logger.error(f"❌ Error saving cache: {e}")

def get_embedder() -> FaceEmbedder:
    """Get the global face embedder instance."""
    global embedder
    if embedder is None:
        embedder = FaceEmbedder(use_gpu=True)
    return embedder