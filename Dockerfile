# Multi-stage build for DeepfakeShield v2.0
FROM python:3.14-slim as backend-builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory for backend
WORKDIR /app/backend

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium
RUN playwright install-deps

# Copy backend code
COPY backend/ .

# Create data directory for SQLite database
RUN mkdir -p /app/backend/data

# ================================
# Frontend build stage
# ================================
FROM node:25-alpine as frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ .

# Build the Next.js application
RUN npm run build

# ================================
# Production stage
# ================================
FROM python:3.14-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    supervisor \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for Next.js
RUN curl -fsSL https://deb.nodesource.com/setup_25.x | bash - \
    && apt-get install -y nodejs

# Create app user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy backend from builder
COPY --from=backend-builder /app/backend /app/backend
COPY --from=backend-builder /root/.cache/ms-playwright /home/appuser/.cache/ms-playwright

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/next.config.ts /app/frontend/next.config.ts
COPY --from=frontend-builder /app/frontend/public /app/frontend/public

# Install backend Python dependencies in production
RUN pip install --no-cache-dir -r backend/requirements.txt
RUN playwright install chromium
RUN playwright install-deps

# Create data directory and set permissions
RUN mkdir -p /app/backend/data && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app

# Create supervisor configuration
RUN mkdir -p /var/log/supervisor
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:backend]
command=uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/app/backend
user=appuser
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/backend.log
stderr_logfile=/var/log/supervisor/backend.log

[program:frontend]
command=npm start
directory=/app/frontend
user=appuser
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.log
stderr_logfile=/var/log/supervisor/frontend.log
environment=PORT=3000,NODE_ENV=production
EOF

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health && curl -f http://localhost:3000 || exit 1

# Switch to app user
USER appuser

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]