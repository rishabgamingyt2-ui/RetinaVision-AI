# RetinaVision AI — ML Backend Dockerfile
# Deploy on Render, AWS ECS, or any container host
# The Docker context is ml-backend/ (set in render.yaml)

FROM python:3.11-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for OpenCV / PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from ml-backend/ into /app
COPY . .

# Expect best_model.pth to be present in /app (same dir as app.py)
# Upload it during build or mount it as a volume

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

EXPOSE 10000

CMD ["gunicorn", "-w", "1", "--bind", "0.0.0.0:10000", "--timeout", "120", "--max-requests", "500", "app:app"]
