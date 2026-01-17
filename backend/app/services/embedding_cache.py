"""
Local embedding cache for fast face recognition.
Queries local cache first, falls back to Pinecone if no match found.
"""

import json
import os
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EmbeddingCache:
    """
    Local cache for face embeddings with Pinecone synchronization.
    Provides fast cosine similarity search without network latency.
    """
    
    def __init__(self, cache_file: str = "embeddings_cache.json"):
        self.cache_file = cache_file
        self.embeddings: Dict[str, Dict] = {}
        self.load_cache()
    
    def load_cache(self) -> None:
        """Load embeddings from JSON file."""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    # Convert embedding lists back to numpy arrays
                    for student_id, record in data.items():
                        self.embeddings[student_id] = {
                            'embedding': np.array(record['embedding'], dtype=np.float32),
                            'metadata': record['metadata']
                        }
                logger.info(f"Loaded {len(self.embeddings)} embeddings from cache")
            except Exception as e:
                logger.error(f"Error loading cache: {e}")
                self.embeddings = {}
        else:
            logger.info("No cache file found, starting with empty cache")
            self.embeddings = {}
    
    def save_cache(self) -> None:
        """Save embeddings to JSON file."""
        try:
            # Convert numpy arrays to lists for JSON serialization
            data = {}
            for student_id, record in self.embeddings.items():
                data[student_id] = {
                    'embedding': record['embedding'].tolist(),
                    'metadata': record['metadata']
                }
            
            with open(self.cache_file, 'w') as f:
                json.dump(data, f)
            logger.info(f"Saved {len(self.embeddings)} embeddings to cache")
        except Exception as e:
            logger.error(f"Error saving cache: {e}")
    
    def sync_from_pinecone(self, index) -> None:
        """
        Fetch all vectors from Pinecone and update local cache.
        
        Args:
            index: Pinecone index instance
        """
        try:
            logger.info("Starting Pinecone cache sync...")
            
            # Fetch all vectors from Pinecone
            # Note: Pinecone query returns limited results, so we need to handle pagination
            # For simplicity, we'll use a large top_k value
            # In production, implement proper pagination
            
            # Create a dummy vector for querying (we want all results)
            dummy_vector = [0.0] * 512  # Assuming 512-dimensional embeddings
            
            results = index.query(
                vector=dummy_vector,
                top_k=10000,  # Get all available vectors
                include_metadata=True,
                include_values=True
            )
            
            synced_count = 0
            for match in results.get('matches', []):
                student_id = match['id']
                embedding = np.array(match['values'], dtype=np.float32)
                metadata = match.get('metadata', {})
                
                self.embeddings[student_id] = {
                    'embedding': embedding,
                    'metadata': metadata
                }
                synced_count += 1
            
            self.save_cache()
            logger.info(f"Synced {synced_count} embeddings from Pinecone")
            
        except Exception as e:
            logger.error(f"Error syncing from Pinecone: {e}")
    
    def add_embedding(self, student_id: str, embedding: np.ndarray, metadata: Dict) -> None:
        """
        Add or update an embedding in the cache.
        
        Args:
            student_id: Student identifier
            embedding: Face embedding vector
            metadata: Additional student information
        """
        self.embeddings[student_id] = {
            'embedding': np.array(embedding, dtype=np.float32),
            'metadata': metadata
        }
        self.save_cache()
        logger.info(f"Added embedding for student {student_id}")
    
    def remove_embedding(self, student_id: str) -> None:
        """Remove an embedding from the cache."""
        if student_id in self.embeddings:
            del self.embeddings[student_id]
            self.save_cache()
            logger.info(f"Removed embedding for student {student_id}")
    
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        Compute cosine similarity between two vectors.
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Similarity score between -1 and 1
        """
        # Normalize vectors
        vec1_norm = vec1 / (np.linalg.norm(vec1) + 1e-8)
        vec2_norm = vec2 / (np.linalg.norm(vec2) + 1e-8)
        
        # Compute dot product
        similarity = np.dot(vec1_norm, vec2_norm)
        return float(similarity)
    
    def search(
        self, 
        query_embedding: np.ndarray, 
        top_k: int = 1, 
        threshold: float = 0.55
    ) -> Optional[List[Dict]]:
        """
        Search for similar embeddings in the cache.
        
        Args:
            query_embedding: Query face embedding
            top_k: Number of top matches to return
            threshold: Minimum similarity threshold
            
        Returns:
            List of matches with student_id, score, and metadata, or None if no match
        """
        if not self.embeddings:
            logger.warning("Cache is empty, returning None")
            return None
        
        # Compute similarities with all cached embeddings
        similarities = []
        for student_id, record in self.embeddings.items():
            similarity = self.cosine_similarity(query_embedding, record['embedding'])
            
            if similarity >= threshold:
                similarities.append({
                    'student_id': student_id,
                    'score': similarity,
                    'metadata': record['metadata']
                })
        
        if not similarities:
            logger.info("No matches found above threshold in cache")
            return None
        
        # Sort by similarity score (descending)
        similarities.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top_k results
        results = similarities[:top_k]
        logger.info(f"Cache hit: Found {len(results)} matches for query")
        return results
    
    def get_stats(self) -> Dict:
        """Get cache statistics."""
        return {
            'total_embeddings': len(self.embeddings),
            'cache_file': self.cache_file,
            'file_exists': os.path.exists(self.cache_file),
            'last_modified': datetime.fromtimestamp(
                os.path.getmtime(self.cache_file)
            ).isoformat() if os.path.exists(self.cache_file) else None
        }


# Global cache instance
embedding_cache = EmbeddingCache()
