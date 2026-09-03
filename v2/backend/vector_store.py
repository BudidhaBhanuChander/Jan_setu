"""
vector_store.py  ChromaDB integration for V2
"""
import chromadb

# Persistent client
client = chromadb.PersistentClient(path="./chroma_data")

_model = None

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"[VectorStore] SentenceTransformer init note: {e}")
            return None
    return _model

# Collections
grievance_collection = client.get_or_create_collection(name="grievances")
knowledge_collection = client.get_or_create_collection(name="ghmc_knowledge")

def embed_text(text: str):
    m = get_embedding_model()
    if m:
        return m.encode(text).tolist()
    return [0.0] * 384

def add_grievance_to_vector_db(tracking_id: str, text: str, category: str):
    vector = embed_text(text)
    grievance_collection.add(
        ids=[tracking_id],
        embeddings=[vector],
        documents=[text],
        metadatas=[{"category": category}]
    )

def find_duplicate(text: str, category: str = None, threshold: float = 1.0):
    """
    Search for similar grievances. Returns tracking_id if found within threshold.
    Chroma uses L2 distance by default (lower is better).
    """
    vector = embed_text(text)
    
    where_clause = {}
    if category:
        where_clause = {"category": category}
        
    results = grievance_collection.query(
        query_embeddings=[vector],
        n_results=1,
        where=where_clause if where_clause else None
    )
    
    if results["distances"] and len(results["distances"][0]) > 0:
        distance = results["distances"][0][0]
        if distance < threshold:
            return results["ids"][0][0]
            
    return None
    
def seed_knowledge_base():
    """Seed RAG rules"""
    rules = [
        "Potholes on main roads must be fixed within 24 hours. Potholes on internal colony roads take 48 hours.",
        "Streetlights not working should be assigned to Electrical department with a 48 hour SLA.",
        "Garbage accumulation is Sanitation department, SLA is 12 hours.",
        "Unauthorized building construction is Town Planning department, SLA is 7 days.",
        "Water supply contamination is Water Works, SLA is 12 hours critical."
    ]
    ids = [f"rule_{i}" for i in range(len(rules))]
    embeddings = [embed_text(r) for r in rules]
    
    knowledge_collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=rules
    )

def query_knowledge_base(query: str):
    vector = embed_text(query)
    results = knowledge_collection.query(
        query_embeddings=[vector],
        n_results=2
    )
    if results["documents"] and len(results["documents"][0]) > 0:
        return "\n".join(results["documents"][0])
    return ""
