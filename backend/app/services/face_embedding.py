import cv2
import torch
import numpy as np
from facenet_pytorch import InceptionResnetV1

class FaceEmbedder:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = InceptionResnetV1(
            pretrained="vggface2"
        ).eval().to(self.device)

    def embed(self, face_img):
        face = cv2.resize(face_img, (160, 160))
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)

        tensor = (
            torch.tensor(face)
            .permute(2, 0, 1)
            .unsqueeze(0)
            .float()
            / 255.0
        ).to(self.device)

        with torch.no_grad():
            emb = self.model(tensor).cpu().numpy()[0]

        return emb / np.linalg.norm(emb)
