import os
from pathlib import Path
from pinecone import Pinecone
from dotenv import load_dotenv

# Load .env from the app directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(
    name=os.getenv("PINECONE_INDEX_NAME"),
    host=os.getenv("PINECONE_HOST")
)
__all__ = ["index", "pc"]