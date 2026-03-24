"""
Scam Database Module
SQLite database for storing and managing reported scams and blocked domains.
"""
import aiosqlite
import time
from pathlib import Path
from urllib.parse import urlparse
from typing import List, Dict, Optional

DB_PATH = Path(__file__).parent.parent.parent / "data" / "scam_reports.db"

async def init_database():
    """Initialize the scam database with required tables."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Reports table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                domain TEXT NOT NULL,
                reporter_ip TEXT,
                category TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                verified BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Blocked domains table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS blocked_domains (
                domain TEXT PRIMARY KEY,
                report_count INTEGER DEFAULT 1,
                first_seen INTEGER NOT NULL,
                last_seen INTEGER NOT NULL,
                auto_blocked BOOLEAN DEFAULT FALSE
            )
        """)
        
        # Create indexes for performance
        await db.execute("CREATE INDEX IF NOT EXISTS idx_reports_domain ON reports(domain)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at)")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_blocked_domains_count ON blocked_domains(report_count)")
        
        await db.commit()

async def submit_report(url: str, reporter_ip: str, category: str, description: str = None) -> dict:
    """Submit a new scam report."""
    try:
        # Parse domain from URL
        parsed = urlparse(url if url.startswith(('http://', 'https://')) else f'https://{url}')
        domain = parsed.netloc.lower()
        
        if not domain:
            return {"error": "Invalid URL"}
        
        current_time = int(time.time())
        
        async with aiosqlite.connect(DB_PATH) as db:
            # Insert report
            await db.execute("""
                INSERT INTO reports (url, domain, reporter_ip, category, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (url, domain, reporter_ip, category, description, current_time))
            
            # Update or insert blocked domain
            await db.execute("""
                INSERT INTO blocked_domains (domain, report_count, first_seen, last_seen)
                VALUES (?, 1, ?, ?)
                ON CONFLICT(domain) DO UPDATE SET
                    report_count = report_count + 1,
                    last_seen = ?
            """, (domain, current_time, current_time, current_time))
            
            # Auto-block if report count exceeds threshold
            await db.execute("""
                UPDATE blocked_domains 
                SET auto_blocked = TRUE 
                WHERE domain = ? AND report_count >= 3
            """, (domain,))
            
            await db.commit()
            
            # Get updated report count
            cursor = await db.execute("SELECT report_count FROM blocked_domains WHERE domain = ?", (domain,))
            row = await cursor.fetchone()
            report_count = row[0] if row else 1
            
            return {
                "success": True,
                "domain": domain,
                "report_count": report_count,
                "auto_blocked": report_count >= 3,
                "timestamp": current_time
            }
            
    except Exception as e:
        return {"error": f"Failed to submit report: {str(e)}"}

async def check_domain_reputation(domain: str) -> dict:
    """Check if a domain is in the scam database."""
    try:
        domain = domain.lower()
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("""
                SELECT report_count, first_seen, last_seen, auto_blocked
                FROM blocked_domains WHERE domain = ?
            """, (domain,))
            row = await cursor.fetchone()
            
            if row:
                report_count, first_seen, last_seen, auto_blocked = row
                return {
                    "found": True,
                    "report_count": report_count,
                    "first_seen": first_seen,
                    "last_seen": last_seen,
                    "auto_blocked": bool(auto_blocked),
                    "risk_level": "high" if auto_blocked else "medium" if report_count >= 2 else "low"
                }
            else:
                return {"found": False}
                
    except Exception as e:
        return {"found": False, "error": str(e)}

async def get_recent_reports(limit: int = 20) -> List[Dict]:
    """Get recent scam reports."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("""
                SELECT url, domain, category, description, created_at, verified
                FROM reports 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,))
            rows = await cursor.fetchall()
            
            reports = []
            for row in rows:
                url, domain, category, description, created_at, verified = row
                reports.append({
                    "url": url,
                    "domain": domain,
                    "category": category,
                    "description": description,
                    "created_at": created_at,
                    "verified": bool(verified),
                    "time_ago": _format_time_ago(created_at)
                })
            
            return reports
            
    except Exception as e:
        return []

async def get_database_stats() -> dict:
    """Get database statistics."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Total reports
            cursor = await db.execute("SELECT COUNT(*) FROM reports")
            total_reports = (await cursor.fetchone())[0]
            
            # Total blocked domains
            cursor = await db.execute("SELECT COUNT(*) FROM blocked_domains")
            total_domains = (await cursor.fetchone())[0]
            
            # Auto-blocked domains
            cursor = await db.execute("SELECT COUNT(*) FROM blocked_domains WHERE auto_blocked = TRUE")
            auto_blocked = (await cursor.fetchone())[0]
            
            # Top reported domains
            cursor = await db.execute("""
                SELECT domain, report_count 
                FROM blocked_domains 
                ORDER BY report_count DESC 
                LIMIT 10
            """)
            top_domains = await cursor.fetchall()
            
            # Reports by category
            cursor = await db.execute("""
                SELECT category, COUNT(*) 
                FROM reports 
                GROUP BY category 
                ORDER BY COUNT(*) DESC
            """)
            categories = await cursor.fetchall()
            
            # Recent activity (last 24h)
            day_ago = int(time.time()) - (24 * 3600)
            cursor = await db.execute("SELECT COUNT(*) FROM reports WHERE created_at > ?", (day_ago,))
            recent_reports = (await cursor.fetchone())[0]
            
            return {
                "total_reports": total_reports,
                "total_domains": total_domains,
                "auto_blocked_domains": auto_blocked,
                "recent_reports_24h": recent_reports,
                "top_domains": [{"domain": d[0], "count": d[1]} for d in top_domains],
                "categories": [{"category": c[0], "count": c[1]} for c in categories]
            }
            
    except Exception as e:
        return {"error": f"Failed to get stats: {str(e)}"}

def _format_time_ago(timestamp: int) -> str:
    """Format timestamp as human-readable time ago."""
    now = int(time.time())
    diff = now - timestamp
    
    if diff < 60:
        return "Just now"
    elif diff < 3600:
        minutes = diff // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif diff < 86400:
        hours = diff // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff < 604800:
        days = diff // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        weeks = diff // 604800
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"

# Categories for scam reports
SCAM_CATEGORIES = [
    "phishing",
    "fake_store",
    "crypto_scam", 
    "romance_scam",
    "tech_support",
    "investment_fraud",
    "malware",
    "spam",
    "other"
]