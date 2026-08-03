# RetinaVision AI — ML Backend

## Overview

Flask-based inference server for retinal disease detection using EfficientNet-B0 with Grad-CAM visualization.

## API Endpoints

### `POST /predict`
Upload a retinal image and get AI-powered diagnosis.

**Request:** `multipart/form-data` with field `image`
**Response:** JSON with disease name, confidence, diagnosis, Grad-CAM heatmap, and class probabilities.

### `GET /health`
Health check endpoint. Returns model status.

### `GET /model-info`
Returns model architecture details, class names, and preprocessing parameters.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Place best_model.pth in this directory

# Run the server
python app.py
# Or with Gunicorn for production:
gunicorn -w 1 --bind 0.0.0.0:5000 --timeout 120 app:app
```

## Deploy to Render

1. Push this repository to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render will detect `render.yaml` and deploy automatically

## File Structure

```
ml-backend/
├── app.py           # Flask application with inference
├── requirements.txt # Python dependencies
├── Dockerfile       # Container build definition
├── render.yaml      # Render Blueprint config
├── Procfile         # Heroku/Render start command
├── README.md        # This file
└── best_model.pth   # Trained model weights (upload to repo)
```
