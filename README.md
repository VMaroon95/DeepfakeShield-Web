# 🛡️ DeepfakeShield-Web v2.0

**Advanced Scam & Phishing Detection Suite** — Verify media authenticity, scan links for scams, and contribute to community threat intelligence. 100% private, zero-trust by default.

## Features

### 🔗 Scam Shield (Link Scanner)
- Typosquatting detection (amaz0n, paypa1, etc.)
- WHOIS domain age check (flags < 30 days old)
- SSL certificate validation
- Visual phishing detection via headless browser screenshots
- Google Safe Browsing API integration (optional)
- Community scam database cross-reference

### 🔍 Deepfake Shield (Media Analyzer)
- Image forensic analysis with EfficientNet model
- Multi-frame video analysis (extracts 5 keyframes)
- GAN noise fingerprinting (DCT/FFT frequency analysis)
- Metadata integrity checks

### 🚨 Threat Intelligence
- Community-driven scam reporting
- Auto-blocking after 3+ reports
- Real-time threat feed dashboard

## Quick Start

### Local Development
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
mkdir -p data
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Deployment

### Frontend → Vercel
1. Import `frontend/` folder in Vercel
2. Set env var: `NEXT_PUBLIC_API_URL` = your Railway backend URL
3. Deploy

### Backend → Railway
1. Create new project in Railway
2. Point to this repo, set root directory to `backend/`
3. Railway auto-detects the Dockerfile
4. Set env var: `CORS_ORIGINS` = your Vercel frontend URL
5. Deploy

## Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, Material You dark theme
- **Backend**: FastAPI, Python, Playwright, SQLite
- **Analysis**: EfficientNet (ONNX), FFT/DCT frequency analysis, perceptual hashing

## Author
**Varun Meda** — [GitHub](https://github.com/VMaroon95) | [LinkedIn](https://linkedin.com/in/varunmeda1)

## License
MIT
