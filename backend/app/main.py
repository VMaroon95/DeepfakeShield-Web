"""
DeepfakeShield Web — Advanced Scam & Phishing Detection Suite
Handles media upload (deepfake detection), URL scanning, and threat reporting.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import media, links, reports

app = FastAPI(
    title="DeepfakeShield API",
    description="Advanced Scam & Phishing Detection Suite - Deepfake detection, Link scanning, and Threat intelligence",
    version="2.0.0",
)

# Build allowed origins from env or defaults
_extra_origins = os.environ.get("CORS_ORIGINS", "").split(",")
_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    # Vercel production + preview domains
    "https://deepfakeshield-web.vercel.app",
    "https://*.vercel.app",
] + [o.strip() for o in _extra_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://deepfakeshield-web.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router, prefix="/api/media", tags=["Media Analysis"])
app.include_router(links.router, prefix="/api/links", tags=["Link Scanner"])
app.include_router(reports.router, prefix="/api/reports", tags=["Threat Reports"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "DeepfakeShield API", "version": "2.0.0"}


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        from app.engine.scam_db import init_database
        await init_database()
        print("✅ Scam database initialized")
    except Exception as e:
        print(f"⚠️  Database initialization failed: {e}")
