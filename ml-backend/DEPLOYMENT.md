# RetinaVision AI — Render Deployment Guide

## Overview

This guide walks you through deploying the **RetinaVision ML Backend** (Flask + PyTorch EfficientNet-B0) on [Render.com](https://render.com), and connecting it to the frontend.

---

## Architecture

```
┌─────────────────────┐         POST /predict         ┌──────────────────────────┐
│  RetinaVision Front  │  ──────────────────────────▶ │  ML Backend (Render)     │
│  (Manus WebDev)      │                                │  Flask + PyTorch        │
│  retinavision.manus  │  ◀────────────────────────── │  EfficientNet-B0        │
│  .space              │    JSON (prediction,          │  Grad-CAM               │
└─────────────────────┘      Grad-CAM, diagnosis)      │  Port: 10000            │
                                                       └──────────────────────────┘
```

---

## Prerequisites

1. A [Render.com](https://render.com) account (free tier available)
2. Your trained `best_model.pth` PyTorch weights file
3. The `retinavision-ai` repository pushed to GitHub

---

## Step 1: Prepare Your Model File

Place your trained model weights in the `ml-backend/` directory (same directory as `app.py`):

```bash
cp /path/to/your/best_model.pth retinavision-ai/ml-backend/best_model.pth
```

The model must be an EfficientNet-B0 with 6 output classes matching these labels in order:

| Index | Class Name |
|-------|-----------|
| 0 | Normal |
| 1 | Diabetic Retinopathy |
| 2 | Glaucoma |
| 3 | Cataract |
| 4 | Age-related Macular Degeneration |
| 5 | Retinal Detachment |

> **If your model uses different class names:** Edit the `CLASS_NAMES` list in `ml-backend/app.py` and update `CLASS_INFO` accordingly. The model's output layer must have exactly 6 neurons.

> **Checkpoint format:** The app handles multiple PyTorch checkpoint formats:
> - Plain state dict: `torch.load("best_model.pth")` returns `{"weight1": ..., ...}`
> - Dict with `"state_dict"` key
> - Dict with `"model_state_dict"` key

---

## Step 2: Push to GitHub

```bash
cd retinavision-ai
git add ml-backend/
git commit -m "Add ML backend for Render deployment"
git push
```

---

## Step 3: Deploy on Render

### Option A: Using the Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `ml-backend/render.yaml` and offer to deploy
5. Click **Apply** — Render builds and deploys the Docker image

### Option B: Manual Docker Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `retinavision-ml-backend` |
| Region | Oregon (or your preference) |
| Branch | `main` |
| Runtime | Docker |
| Dockerfile Path | `ml-backend/Dockerfile` |
| Docker Context | `ml-backend` |
| Build Command | *(leave empty)* |
| Start Command | `gunicorn -w 1 --bind 0.0.0.0:$PORT --timeout 120 --max-requests 500 app:app` |
| Instance Type | Free (or Starter $7/mo for production) |

5. Set Environment Variables:

| Variable | Value |
|----------|-------|
| `MODEL_PATH` | `best_model.pth` |
| `PORT` | `10000` |

6. Click **Create Web Service**

---

## Step 4: Verify the Deployment

Once deployed, test the endpoints:

```bash
# Health check
curl https://retinavision-ml-backend.onrender.com/health

# Get model info
curl https://retinavision-ml-backend.onrender.com/model-info

# Test prediction (replace with an actual retinal image)
curl -X POST https://retinavision-ml-backend.onrender.com/predict \
  -F "image=@/path/to/retina.jpg"
```

Expected health response:
```json
{
  "status": "healthy",
  "model": "EfficientNet-B0",
  "device": "cpu",
  "classes": 6
}
```

> **Check the startup logs** on Render to confirm the model weights loaded successfully. You should see:
> ```
> INFO: Loading EfficientNet-B0 model from best_model.pth...
> INFO: Model weights loaded successfully.
> INFO: Model ready for inference on cpu.
> ```

---

## Step 5: Connect Frontend to ML Backend

### In the Manus WebDev Project

1. Open the Management UI → **Settings** → **Secrets**
2. Add the environment variable:
   - **Key:** `VITE_ML_BACKEND_URL`
   - **Value:** `https://retinavision-ml-backend.onrender.com` (your actual Render URL)
3. Save and the frontend will pick up the new value on next build

### Verify Connection

1. Open the deployed RetinaVision app
2. Navigate to **Dashboard → Image Analysis**
3. Check the top-right status badge — it should show **"ML Backend Online"** with a green dot
4. Upload a retinal image and click **Analyze**
5. Real predictions from your EfficientNet-B0 model will appear

---

## API Reference

### `POST /predict`

Upload a retinal image and receive a full analysis with Grad-CAM.

**Request:** `multipart/form-data` with `image` field

**Response:**
```json
{
  "success": true,
  "prediction": "Diabetic Retinopathy",
  "confidence": 0.9234,
  "confidence_percentage": 92.34,
  "class_probabilities": {
    "Normal": 0.02,
    "Diabetic Retinopathy": 0.9234,
    "Glaucoma": 0.03,
    "Cataract": 0.015,
    "Age-related Macular Degeneration": 0.008,
    "Retinal Detachment": 0.003
  },
  "diagnosis": {
    "disease": "Diabetic Retinopathy",
    "confidence": 0.9234,
    "severity": "High",
    "description": "Damage to retinal blood vessels...",
    "recommendation": "Immediate referral to retinal specialist...",
    "severity_color": "#ef4444"
  },
  "gradcam": "data:image/png;base64,iVBOR...",
  "original_image": "data:image/png;base64,iVBOR...",
  "model_info": {
    "architecture": "EfficientNet-B0",
    "num_classes": 6,
    "classes": ["Normal", "Diabetic Retinopathy", "..."],
    "device": "cpu"
  }
}
```

### `GET /health`

Health check endpoint for monitoring and load balancers.

### `GET /model-info`

Returns model metadata, class info, and preprocessing configuration.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `best_model.pth` | Path to the PyTorch model weights (relative to working dir) |
| `PORT` | `10000` | Port the server listens on (Render sets this automatically) |
| `VITE_ML_BACKEND_URL` | *(empty)* | Frontend env var pointing to the deployed ML backend |

---

## Troubleshooting

### "Model file not found" on startup

Ensure `best_model.pth` is committed to the `ml-backend/` directory. It must be present during Docker build. If the file is too large (>100MB), consider hosting it on S3/GCS and downloading it during build.

### High latency on first request (free tier)

Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start may take 30-60 seconds as the container boots and loads the model into memory. Subsequent requests are fast (~1-2 seconds).

### CORS errors

The Flask backend includes `flask-cors` middleware configured to allow all origins. If you still see CORS errors, verify the frontend is calling the correct Render URL.

### Memory issues on free tier

EfficientNet-B0 uses ~30MB for weights and ~200-300MB for PyTorch + inference. The free tier (512MB RAM) should be sufficient. If you see OOM errors, upgrade to the Starter plan ($7/month, 1GB RAM).

### Model uses different preprocessing

The `app.py` uses standard ImageNet normalization:
- Resize: 224×224
- Mean: [0.485, 0.456, 0.406]
- Std: [0.229, 0.224, 0.225]

If your training pipeline used different preprocessing, update the `transform` variable in `app.py` to match exactly.

---

## Project Structure

```
retinavision-ai/
├── client/              # React frontend (Manus WebDev)
├── server/              # Express backend (Manus WebDev)
├── ml-backend/          # Flask ML inference server (deployed on Render)
│   ├── app.py           # Main Flask application with EfficientNet-B0
│   ├── Dockerfile       # Docker image (context: ml-backend/)
│   ├── Procfile         # Alternative start command
│   ├── requirements.txt # Python dependencies
│   ├── render.yaml      # Render Blueprint config
│   ├── README.md        # ML backend quick reference
│   ├── DEPLOYMENT.md    # This deployment guide
│   └── best_model.pth   # Your trained model weights (commit this!)
├── package.json
├── README.md            # Main project README
└── ...
```

---

## Local Development

Run the ML backend locally for testing:

```bash
cd ml-backend
pip install -r requirements.txt
python app.py
```

Test with curl:
```bash
curl -X POST http://localhost:5000/predict \
  -F "image=@/path/to/retina.jpg"
```

To connect the local frontend to your local ML backend, set the secret:
```
VITE_ML_BACKEND_URL = http://localhost:5000
```
