# RetinaVision AI — ML Backend Dockerfile
# Deploy on Render, AWS ECS, or any container host
#
# BUILD CONFIGURATION
#   Recommended: build with context = ml-backend/ (repo root is NOT needed).
#     - best_model.pth must be placed inside ml-backend/ before building
#       (or bind-mounted / set as a secret in Render: "Start Command" override).
#   Alternative: build with context = . and point Dockerfile path to
#     ml-backend/Dockerfile, then COPY ml-backend/ /app/ and
#     COPY best_model.pth /app/best_model.pth.
#
# The Flask app reads the model location from the MODEL_PATH env var
# (defaults to best_model.pth in the working directory).

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

# Copy all files from the build context (ml-backend/ contents)
COPY . .

# Health check (Render injects PORT; HEALTHCHECK uses it if set)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import os, urllib.request; p=os.environ.get('PORT','10000'); urllib.request.urlopen(f'http://localhost:{p}/health')" || exit 1

EXPOSE 10000

CMD ["gunicorn", "-w", "1", "--bind", "0.0.0.0:10000", "--timeout", "120", "--max-requests", "500", "app:app"]
