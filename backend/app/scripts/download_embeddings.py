"""
Local embedding cache for fast face recognition.
Queries local cache first, falls back to Pinecone if no match found.
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class EmbeddingCache:
    """
    Local cache for face embeddings.
    Queries this cache first before hitting Pinecone for faster lookups.
    """
    
    def __init__(self, cache_file: str = "embeddings_cache.json"):
        self.cache_file = Path(cache_file)
        self.embeddings = self.load_cache()
    
    def load_cache(self) -> Dict:
        """Load embeddings from JSON file"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    logger.info(f"✅ Loaded {len(data)} embeddings from cache")
                    return data
            except Exception as e:
                logger.error(f"Error loading cache: {e}")
                return {}
        return {}
    
    def save_cache(self):
        """Save embeddings to JSON file"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.embeddings, f, indent=2)
            logger.info(f"💾 Saved {len(self.embeddings)} embeddings to {self.cache_file}")
        except Exception as e:
            logger.error(f"Error saving cache: {e}")
    
    def sync_from_pinecone(self, pinecone_index):
        """
        Fetch ALL embeddings from Pinecone using query method (most reliable).
        
        Args:
            pinecone_index: Pinecone index instance
            
        Returns:
            int: Number of embeddings cached
        """
        logger.info("=" * 60)
        logger.info("🔄 SYNCING EMBEDDINGS FROM PINECONE")
        logger.info("=" * 60)
        
        try:
            # Step 1: Get total vector count
            stats = pinecone_index.describe_index_stats()
            total_vectors = stats.get('total_vector_count', 0)
            
            logger.info(f"\n📊 Index Statistics:")
            logger.info(f"   Total vectors: {total_vectors}")
            logger.info(f"   Namespaces: {stats.get('namespaces', {})}")
            
            if total_vectors == 0:
                logger.warning("⚠️  No vectors found in Pinecone index!")
                return 0
            
            # Step 2: Use query method to get ALL vectors
            # This is the most reliable method that worked in download_embeddings.py
            logger.info(f"\n📥 Fetching all vectors using query method...")
            
            try:
                # Query with dummy vector to get all embeddings
                result = pinecone_index.query(
                    vector=[0.0] * 512,  # 512-dimensional zero vector
                    top_k=10000,  # Pinecone's maximum (should be enough for most use cases)
                    include_values=True,  # Include embedding vectors
                    include_metadata=True  # Include student metadata
                )
                
                # Handle both dict and object response formats
                if isinstance(result, dict):
                    matches = result.get('matches', [])
                else:
                    matches = result.matches if hasattr(result, 'matches') else []
                
                logger.info(f"✅ Query returned {len(matches)} matches")
                
                # Clear existing cache and store new embeddings
                self.embeddings = {}
                
                for match in matches:
                    # Handle both dict and object formats
                    if isinstance(match, dict):
                        student_id = match.get('id')
                        values = match.get('values', [])
                        metadata = match.get('metadata', {})
                    else:
                        student_id = match.id if hasattr(match, 'id') else None
                        values = match.values if hasattr(match, 'values') else []
                        metadata = match.metadata if hasattr(match, 'metadata') else {}
                    
                    if student_id:
                        self.embeddings[student_id] = {
                            'embedding': values,
                            'metadata': metadata
                        }
                
                logger.info(f"✅ Stored {len(self.embeddings)} embeddings in cache")
                
                # Save to disk
                self.save_cache()
                
                # Summary
                logger.info("\n" + "=" * 60)
                logger.info("📊 SYNC SUMMARY:")
                logger.info(f"   Total vectors in Pinecone: {total_vectors}")
                logger.info(f"   Successfully cached: {len(self.embeddings)}")
                logger.info(f"   Success rate: {len(self.embeddings)/total_vectors*100:.1f}%")
                logger.info(f"   Cache file: {self.cache_file}")
                
                # Show sample IDs
                if self.embeddings:
                    sample_ids = list(self.embeddings.keys())[:5]
                    logger.info(f"\n📋 Sample student IDs:")
                    for sid in sample_ids:
                        metadata = self.embeddings[sid].get('metadata', {})
                        embedding_size = len(self.embeddings[sid].get('embedding', []))
                        logger.info(f"   - {sid}: {embedding_size} dimensions, {metadata}")
                
                logger.info("=" * 60 + "\n")
                
                return len(self.embeddings)
                
            except Exception as query_error:
                logger.error(f"❌ Query method failed: {query_error}")
                logger.exception(query_error)
                return 0
            
        except Exception as e:
            logger.error(f"\n❌ SYNC FAILED: {e}")
            logger.exception(e)
            return 0
    
    def search(self, query_embedding: np.ndarray, top_k: int = 1, threshold: float = 0.55) -> Optional[List[Dict]]:
        """
        Search for matching faces in local cache using cosine similarity.
        
        Args:
            query_embedding: Face embedding to search for (numpy array)
            top_k: Number of top matches to return
            threshold: Minimum similarity score (0-1)
            
        Returns:
            List of matches with student_id, score, and metadata
            None if no matches above threshold
        """
        if len(self.embeddings) == 0:
            logger.warning("⚠️  Cache is empty, cannot search")
            return None
        
        # Convert query to numpy array if needed
        if isinstance(query_embedding, list):
            query_embedding = np.array(query_embedding, dtype=np.float32)
        
        # Normalize query embedding
        query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-8)
        
        # Compute cosine similarity with all cached embeddings
        similarities = []
        
        for student_id, data in self.embeddings.items():
            cached_embedding = np.array(data['embedding'], dtype=np.float32)
            cached_norm = cached_embedding / (np.linalg.norm(cached_embedding) + 1e-8)
            
            # Cosine similarity
            similarity = np.dot(query_norm, cached_norm)
            
            if similarity >= threshold:
                similarities.append({
                    'student_id': student_id,
                    'score': float(similarity),
                    'metadata': data['metadata']
                })
        
        if len(similarities) == 0:
            return None
        
        # Sort by score descending
        similarities.sort(key=lambda x: x['score'], reverse=True)
        
        return similarities[:top_k]
    
    def add_embedding(self, student_id: str, embedding: np.ndarray, metadata: Dict):
        """Add a new embedding to the cache"""
        self.embeddings[student_id] = {
            'embedding': embedding.tolist() if isinstance(embedding, np.ndarray) else embedding,
            'metadata': metadata
        }
        self.save_cache()
    
    def remove_embedding(self, student_id: str):
        """Remove an embedding from the cache"""
        if student_id in self.embeddings:
            del self.embeddings[student_id]
            self.save_cache()
            return True
        return False
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        return {
            'total_embeddings': len(self.embeddings),
            'cache_file': str(self.cache_file),
            'file_exists': self.cache_file.exists(),
            'student_ids': list(self.embeddings.keys())[:10]  # First 10 IDs as sample
        }


# Global cache instance
embedding_cache = EmbeddingCache()