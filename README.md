# 🛡️ DeepfakeShield Web

**Verify media authenticity & scan links for scams — all in one platform.**

> Is this video fake? Is this link a scam? Find out instantly.

## 🚀 Quick Start

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install fastapi uvicorn python-multipart pillow numpy onnxruntime aiofiles httpx
uvicorn app.main:app --port 8000

# Frontend (new terminal)
cd frontend
npm install && npm run dev
```

Open http://localhost:3000

## 🔍 Features

### Deepfake Scanner
- Drag & drop any image
- 6-point forensic analysis
- Risk score (0-100) with verdict gauge
- Digital integrity checks (EXIF, compression, pixel coherence)
- Full forensic report export

### Link Checker
- Paste any suspicious URL
- 7-point security scan:
  - Typosquatting detection (amaz0n, paypa1, etc.)
  - Suspicious TLD flagging
  - Phishing pattern matching
  - HTTPS verification
  - IP address detection
  - Subdomain analysis
  - Google Safe Browsing API (when configured)

## 🏗️ Architecture

```
DeepfakeShield-Web/
├── frontend/          # Next.js + Tailwind (Material You dark)
│   └── src/
│       ├── app/       # Pages
│       └── components/
│           ├── MediaAnalyzer.tsx    # Drag & drop upload
│           ├── LinkScanner.tsx      # URL input
│           ├── ForensicReport.tsx   # Media results
│           └── LinkReport.tsx       # Link results
├── backend/           # FastAPI (Python)
│   └── app/
│       ├── engine/
│       │   ├── deepfake_detector.py  # ONNX inference
│       │   └── link_scanner.py       # URL analysis
│       └── routers/
│           ├── media.py    # POST /api/media/analyze
│           └── links.py    # POST /api/links/scan
└── models/            # ONNX model files
```

## 🔒 Privacy

- No data stored on server
- No accounts required
- Models run locally
- Open source — audit the code

## Author

**Varun Meda** — [GitHub](https://github.com/VMaroon95) · [LinkedIn](https://linkedin.com/in/varunmeda1)
