import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis
import logging

logger = logging.getLogger(__name__)


class FaceEmbedder:
    def __init__(self, use_gpu: bool = True):
        # Initialize InsightFace with ArcFace model
        logger.info("Initializing FaceAnalysis with buffalo_l model...")
        
        # Ensure model directory exists
        model_dir = os.path.expanduser("~/.insightface")
        os.makedirs(model_dir, exist_ok=True)
        
        # Check GPU availability
        try:
            import torch
            gpu_available = torch.cuda.is_available()
            if gpu_available and use_gpu:
                logger.info(f"GPU detected: {torch.cuda.get_device_name(0)}")
                logger.info(f"CUDA version: {torch.version.cuda}")
            else:
                logger.warning("GPU not available or disabled, using CPU")
        except ImportError:
            logger.warning("PyTorch not installed, cannot verify GPU")
            gpu_available = False
        
        # Initialize with GPU provider if available
        if use_gpu and gpu_available:
            # Force CUDA execution provider for GPU acceleration
            self.app = FaceAnalysis(
                name="buffalo_l",
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            ctx_id = 0  # Use GPU
        else:
            self.app = FaceAnalysis(name="buffalo_l")
            ctx_id = -1  # Use CPU
        
        logger.info("Preparing model (this may download models on first run)...")
        # det_size controls detection resolution (higher = better detection but slower)
        # ctx_id=0 uses GPU, -1 for CPU
        self.app.prepare(ctx_id=ctx_id, det_size=(640, 640))
        
        self.ctx_id = ctx_id
        logger.info(f"FaceEmbedder initialized successfully! Using: {'GPU' if ctx_id == 0 else 'CPU'}")

    def embed_batch(self, face_images):
        """
        Process multiple face images in batch for GPU efficiency.
        
        Args:
            face_images: List of BGR images (numpy arrays) containing faces
            
        Returns:
            List of normalized 512-dimensional embedding vectors
        """
        embeddings = []
        
        for face_img in face_images:
            try:
                faces = self.app.get(face_img)
                
                if len(faces) > 0:
                    # Get embedding from the first (or largest) face
                    embedding = faces[0].embedding
                    # Ensure normalization
                    embeddings.append(embedding / np.linalg.norm(embedding))
                else:
                    logger.warning("No face detected in batch image")
                    embeddings.append(None)
            except Exception as e:
                logger.error(f"Error processing batch image: {e}")
                embeddings.append(None)
        
        return embeddings

    def embed(self, face_img):
        """
        Generate face embedding using ArcFace.
        
        Args:
            face_img: BGR image (numpy array) containing a face
            
        Returns:
            Normalized 512-dimensional embedding vector
        """
        # InsightFace expects BGR format (which OpenCV provides)
        faces = self.app.get(face_img)
        
        if len(faces) == 0:
            raise ValueError("No face detected in the image")
        
        # Get embedding from the first (or largest) face
        # InsightFace returns 512-dim embedding, already normalized
        embedding = faces[0].embedding
        
        # Ensure normalization (InsightFace usually returns normalized vectors)
        return embedding / np.linalg.norm(embedding)

    def embed_aligned(self, face_img):
        """
        Alternative method for pre-cropped face images.
        Uses direct embedding extraction without detection.
        
        Args:
            face_img: BGR image of cropped face
            
        Returns:
            Normalized 512-dimensional embedding vector
        """
        # Resize to expected input size
        face = cv2.resize(face_img, (112, 112))
        
        # Get the recognition model directly
        if not hasattr(self, '_rec_model'):
            self._rec_model = self.app.models.get('recognition')
        
        # Get embedding
        embedding = self._rec_model.get_feat(face).flatten()
        
        return embedding / np.linalg.norm(embedding)
