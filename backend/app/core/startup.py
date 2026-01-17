"""
Startup initialization for the attendance system.
Handles GPU verification, model warmup, and cache synchronization.
"""

import logging
import numpy as np
from app.services.face_embedding import FaceEmbedder
from app.services.embedding_cache import embedding_cache
from app.core.pinecone_client import index as pinecone_index

logger = logging.getLogger(__name__)

# Global instances
embedder = None

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
            
            # Memory info
            mem_allocated = torch.cuda.memory_allocated(0) / 1024**2
            mem_reserved = torch.cuda.memory_reserved(0) / 1024**2
            logger.info(f"  Memory Allocated: {mem_allocated:.2f} MB")
            logger.info(f"  Memory Reserved: {mem_reserved:.2f} MB")
            logger.info("=" * 50)
            
            return True
        else:
            logger.warning("=" * 50)
            logger.warning("GPU NOT AVAILABLE - Using CPU")
            logger.warning("Performance will be degraded")
            logger.warning("=" * 50)
            return False
            
    except ImportError:
        logger.error("PyTorch not installed - cannot verify GPU")
        return False
    except Exception as e:
        logger.error(f"Error checking GPU: {e}")
        return False

def warmup_models():
    """
    Warm up face detection and embedding models by running dummy inference.
    This loads models into GPU memory for faster subsequent processing.
    """
    global embedder
    
    try:
        logger.info("Warming up face detection and embedding models...")
        
        # Create a dummy 640x640 RGB image
        dummy_frame = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        
        # Run face detection (loads detection model into GPU)
        try:
            faces = embedder.app.get(dummy_frame)
            logger.info(f"Detection model warmed up (detected {len(faces)} faces in dummy image)")
        except Exception as e:
            logger.warning(f"Detection warmup failed (expected): {e}")
        
        logger.info("Model warmup completed!")
        
    except Exception as e:
        logger.error(f"Error during model warmup: {e}")

async def on_startup():
    """
    Main startup initialization function.
    Called when FastAPI application starts.
    """
    global embedder
    
    logger.info("=" * 60)
    logger.info("🚀 STARTING HACKCRYPT ATTENDANCE SYSTEM")
    logger.info("=" * 60)
    
    # 1. Check GPU availability
    logger.info("\n📊 Step 1: Checking GPU availability...")
    gpu_available = check_gpu()
    
    # 2. Initialize face embedder with GPU if available
    logger.info("\n🤖 Step 2: Initializing face embedder...")
    embedder = FaceEmbedder(use_gpu=gpu_available)
    logger.info("✅ Face embedder initialized")
    
    # 3. Warm up models
    logger.info("\n🔥 Step 3: Warming up models...")
    warmup_models()
    
    # 4. Sync embedding cache from Pinecone
    logger.info("\n💾 Step 4: Syncing embedding cache from Pinecone...")
    try:
        num_cached = embedding_cache.sync_from_pinecone(pinecone_index)
        
        if num_cached > 0:
            logger.info(f"✅ Cache synchronized successfully: {num_cached} embeddings")
        else:
            logger.warning("⚠️  No embeddings were cached, will use Pinecone directly")
            
    except Exception as e:
        logger.error(f"❌ Error syncing cache: {e}")
        logger.warning("⚠️  Will use Pinecone directly for all queries")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ STARTUP COMPLETE - SYSTEM READY")
    logger.info("=" * 60 + "\n")

async def on_shutdown():
    """Cleanup on application shutdown."""
    logger.info("\n" + "=" * 60)
    logger.info("👋 SHUTTING DOWN HACKCRYPT ATTENDANCE SYSTEM")
    logger.info("=" * 60)
    
    # Save cache one final time
    try:
        embedding_cache.save_cache()
        logger.info("✅ Embedding cache saved")
    except Exception as e:
        logger.error(f"❌ Error saving cache on shutdown: {e}")
    
    logger.info("=" * 60)
    logger.info("✅ SHUTDOWN COMPLETE")
    logger.info("=" * 60 + "\n")

def get_embedder() -> FaceEmbedder:
    """Get the global face embedder instance."""
    global embedder
    
    if embedder is None:
        logger.warning("⚠️  Embedder not initialized, creating new instance...")
        embedder = FaceEmbedder(use_gpu=True)
    
    return embedder