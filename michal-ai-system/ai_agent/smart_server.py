"""
FastAPI Server for Life Orchestrator
=====================================
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import asyncio

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the Life Orchestrator
try:
    from life_orchestrator import LifeOrchestrator, ContextNode, EntityType
    orchestrator = LifeOrchestrator()
    print("✅ Life Orchestrator loaded successfully")
except ImportError as e:
    print(f"⚠️ Failed to import Life Orchestrator: {e}")
    orchestrator = None

# Create FastAPI app
app = FastAPI(
    title="Life Orchestrator API",
    description="Intelligent Life Management System",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = {}

class TaskRequest(BaseModel):
    task: Dict[str, Any]

class EmailRequest(BaseModel):
    email: Dict[str, Any]

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {
        "status": "active",
        "service": "Life Orchestrator",
        "version": "2.0.0",
        "orchestrator_ready": orchestrator is not None
    }

@app.get("/health")
async def health():
    graph_stats = {}
    memory_stats = {}
    
    if orchestrator:
        graph_stats = {
            "nodes": len(orchestrator.graph.nodes),
            "edges": len(orchestrator.graph.edges),
            "node_types": list(orchestrator.graph.index.keys())
        }
        memory_stats = {
            "short_term": len(orchestrator.memory.short_term),
            "long_term": len(orchestrator.memory.long_term),
            "patterns": len(orchestrator.memory.patterns)
        }
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "orchestrator_active": orchestrator is not None,
        "graph": graph_stats,
        "memory": memory_stats
    }

@app.post("/chat")
async def chat(request: ChatRequest):
    """Main chat endpoint"""
    if not orchestrator:
        return {
            "response": "מצטער, המערכת לא זמינה כרגע",
            "error": "Orchestrator not initialized"
        }
    
    try:
        result = await orchestrator.process_message(request.message, request.context)
        return result
    except Exception as e:
        print(f"Error in chat: {e}")
        return {
            "response": "אירעה שגיאה בעיבוד ההודעה",
            "error": str(e)
        }

@app.post("/ingest/task")
async def ingest_task(request: TaskRequest):
    """Ingest a new task"""
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    
    try:
        perception = await orchestrator.perceive({"task": request.task})
        return {
            "success": True,
            "perception": perception
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/ingest/email")
async def ingest_email(request: EmailRequest):
    """Ingest an email"""
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    
    try:
        perception = await orchestrator.perceive({"email": request.email})
        return {
            "success": True,
            "perception": perception
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/state")
async def get_state():
    """Get current system state"""
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    
    decision = await orchestrator.decide()
    
    return {
        "graph": {
            "nodes": len(orchestrator.graph.nodes),
            "edges": len(orchestrator.graph.edges),
            "index": {k.value: len(v) for k, v in orchestrator.graph.index.items()}
        },
        "memory": {
            "short_term": len(orchestrator.memory.short_term),
            "long_term": len(orchestrator.memory.long_term),
            "episodic": len(orchestrator.memory.episodic),
            "patterns": len(orchestrator.memory.patterns)
        },
        "analysis": decision.get("analysis", {}),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/learn")
async def learn_from_feedback(feedback: Dict[str, Any]):
    """Submit feedback for learning"""
    if not orchestrator:
        return {"error": "Orchestrator not initialized"}
    
    try:
        await orchestrator.learn(feedback)
        return {"success": True, "message": "Feedback processed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    host = os.getenv("SMART_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SMART_SERVER_PORT", "8000"))
    
    print("🚀 Starting Life Orchestrator Server...")
    print(f"📡 API available at: http://{host}:{port}")
    print(f"📚 Documentation: http://{host}:{port}/docs")
    
    uvicorn.run(app, host=host, port=port, log_level="info")
