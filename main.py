"""
FastAPI main application - Direct replacement for Gradio interface
"""
## uvicorn main:app --reload --port 8000
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api.routes import deals, websocket_handler
from src.agents.deal_agent_framework import DealAgentFramework


# Global app state
app_state = {}


def _get_origins() -> list[str]:
    """CORS origins from env; default localhost for dev."""
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize app state on startup; on failure set framework to None and store error."""
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S %z",
    )
    app_state["deal_framework"] = None
    app_state["init_error"] = None
    try:
        app_state["deal_framework"] = DealAgentFramework()
        app_state["deal_framework"].init_agents_as_needed()
    except Exception as e:
        logging.exception("Deal framework failed to initialize")
        app_state["init_error"] = str(e)
        app_state["deal_framework"] = None

    yield

    app_state.clear()


# Create FastAPI app
app = FastAPI(
    title="DealSense AI API",
    description="Autonomous AI Agents Finding the Best Deals Online",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS from environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(deals.router, prefix="/api", tags=["deals"])
app.include_router(websocket_handler.router, prefix="/ws", tags=["websocket"])

# Serve static files (React build)
if os.path.exists("frontend/build"):
    app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")
    app.mount("/", StaticFiles(directory="frontend/build", html=True), name="frontend")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "DealSense AI Backend is running"}


@app.get("/health")
async def health_check():
    """Health check for the application. Returns 503 if framework failed to initialize."""
    fw = app_state.get("deal_framework")
    memory_count = len(fw.memory) if fw is not None and hasattr(fw, "memory") else 0
    body = {
        "status": "healthy" if fw is not None else "degraded",
        "framework_initialized": fw is not None,
        "memory_count": memory_count,
    }
    if fw is None:
        return JSONResponse(status_code=503, content=body)
    return body


def get_deal_framework() -> DealAgentFramework:
    """Get the initialized deal framework; 503 if init failed."""
    fw = app_state.get("deal_framework")
    if fw is None:
        init_err = app_state.get("init_error") or "Deal framework not initialized"
        raise HTTPException(status_code=503, detail=f"Service unavailable: {init_err}")
    return fw


# Make framework accessible to other modules
app.state.get_deal_framework = get_deal_framework