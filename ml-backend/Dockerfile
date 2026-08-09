# RetinaVision AI — ML Backend Dockerfile
# Deploy on Render, AWS ECS, or any container host
#
# IMPORTANT: The model file (best_model.pth) is at the REPO ROOT.
# When deploying on Render with context: . (repo root), the Dockerfile at
# ml-backend/Dockerfile can access ../best_model.pth via COPY ../best_model.pth.
# When deploying with context: ml-backend/, copy the model into ml-backend/ first.

FROM python:3.11-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for PIL / image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from the ml-backend/ directory
COPY . .

# If the build context is the repo root (context: .), also copy the model
# from the parent directory. This line is a no-op if context is ml-backend/.
COPY best_model.pth /app/best_model.pth 2>/dev/null || true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

EXPOSE 10000

CMD ["gunicorn", "-w", "1", "--bind", "0.0.0.0:10000", "--timeout", "120", "--max-requests", "500", "app:app"]
