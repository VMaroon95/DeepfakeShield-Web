"""Scam reporting and threat intelligence endpoints."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.engine.scam_db import (
    submit_report, 
    get_recent_reports, 
    get_database_stats,
    SCAM_CATEGORIES,
    init_database
)

router = APIRouter()


class ScamReportRequest(BaseModel):
    url: str
    category: str
    description: Optional[str] = None


@router.post("/submit")
async def submit_scam_report(report: ScamReportRequest, request: Request):
    """Submit a new scam report."""
    # Validate category
    if report.category not in SCAM_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Must be one of: {', '.join(SCAM_CATEGORIES)}")
    
    # Validate URL
    if not report.url or len(report.url) < 4:
        raise HTTPException(400, "Invalid URL")
    
    # Get client IP for tracking
    client_ip = request.client.host if request.client else "unknown"
    
    # Initialize database if needed
    try:
        await init_database()
    except Exception as e:
        raise HTTPException(500, f"Database initialization failed: {str(e)}")
    
    # Submit report
    result = await submit_report(
        url=report.url,
        reporter_ip=client_ip,
        category=report.category,
        description=report.description
    )
    
    if result.get("error"):
        raise HTTPException(400, result["error"])
    
    return {
        "success": True,
        "message": "Report submitted successfully",
        "domain": result.get("domain"),
        "report_count": result.get("report_count"),
        "auto_blocked": result.get("auto_blocked", False)
    }


@router.get("/recent")
async def get_recent_scam_reports(limit: int = 20):
    """Get recent scam reports."""
    if limit > 100:
        limit = 100
    
    try:
        await init_database()
    except:
        pass
    
    reports = await get_recent_reports(limit)
    return {
        "reports": reports,
        "count": len(reports)
    }


@router.get("/stats")
async def get_threat_stats():
    """Get threat intelligence statistics."""
    try:
        await init_database()
    except:
        pass
    
    stats = await get_database_stats()
    
    if stats.get("error"):
        raise HTTPException(500, stats["error"])
    
    return stats


@router.get("/categories")
async def get_report_categories():
    """Get available scam report categories."""
    return {
        "categories": [
            {"id": "phishing", "label": "🎣 Phishing", "description": "Fake login pages, credential theft"},
            {"id": "fake_store", "label": "🛍️ Fake Store", "description": "Fraudulent online stores"},
            {"id": "crypto_scam", "label": "₿ Crypto Scam", "description": "Cryptocurrency fraud, fake exchanges"},
            {"id": "romance_scam", "label": "💔 Romance Scam", "description": "Dating/relationship fraud"},
            {"id": "tech_support", "label": "🖥️ Tech Support", "description": "Fake tech support scams"},
            {"id": "investment_fraud", "label": "📈 Investment Fraud", "description": "Fake investment opportunities"},
            {"id": "malware", "label": "🦠 Malware", "description": "Malicious software distribution"},
            {"id": "spam", "label": "📧 Spam", "description": "Unwanted promotional content"},
            {"id": "other", "label": "❓ Other", "description": "Other types of scams"}
        ]
    }