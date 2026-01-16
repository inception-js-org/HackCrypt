import cv2
import numpy as np
from insightface.app import FaceAnalysis

class FaceEmbedder:
    def __init__(self):
        # Initialize InsightFace with ArcFace model
        self.app = FaceAnalysis(
            name="buffalo_l",  # Best accuracy model
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        # det_size controls detection resolution (higher = better detection but slower)
        self.app.prepare(ctx_id=0, det_size=(640, 640))

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
