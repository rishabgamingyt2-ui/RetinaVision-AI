# Deployment Guide — RetinaVision AI

Complete deployment instructions for **Render (ML Backend)** and **Vercel (Frontend)**.

---

## Architecture Overview

```
┌─────────────────────┐     POST /predict      ┌─────────────────────┐
│                     │ ──────────────────────→ │                     │
│   Vercel (React)    │                         │   Render (Flask)    │
│   Frontend SPA      │ ←────────────────────── │   ML Backend        │
│                     │   JSON: prediction,     │   EfficientNet-B0   │
│                     │   confidence, Grad-CAM  │   + Grad-CAM        │
└─────────────────────┘                         └─────────────────────┘
```

---

## Part 1: Deploy ML Backend on Render

### Step 1: Push the `best_model.pth` to your GitHub repo

The model file is already in your repo at `best_model.pth` (16MB). Make sure it's committed.

### Step 2: Create a New Web Service on Render

1. Go to [https://render.com](https://render.com) and log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `rishabgamingyt2-ui/RetinaVision-AI`

### Step 3: Configure the Service

| Setting | Value |
|---------|-------|
| **Name** | `retinavision-ml-backend` |
| **Region** | Oregon (or closest to you) |
| **Runtime** | Docker |
| **Docker Command** | (leave empty — uses CMD from Dockerfile) |
| **Instance Type** | Free (or Starter for faster inference) |

### Step 4: Set Environment Variables

In Render → Settings → Environment:

| Key | Value |
|-----|-------|
| `PORT` | `10000` |
| `MODEL_PATH` | `best_model.pth` |
| `DEVICE` | `cpu` |

### Step 5: Deploy

Click **"Create Web Service"**. Render will build the Docker image and deploy.

The backend will be available at: `https://retinavision-ml-backend.onrender.com`

### Alternative: Manual Deployment (without Docker)

If you prefer not to use Docker:

1. Create a **Python** web service on Render
2. Set **Build Command**: `pip install -r ml-backend/requirements.txt`
3. Set **Start Command**: `cd ml-backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 1`
4. Set **Root Directory**: `/` (repo root)
5. Add env vars: `MODEL_PATH=best_model.pth`, `DEVICE=cpu`

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Connect Your GitHub Repo to Vercel

1. Go to [https://vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repo: `rishabgamingyt2-ui/RetinaVision-AI`

### Step 2: Configure Build Settings

Vercel will auto-detect Vite. The `vercel.json` config handles the rest, but you can also set manually:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `vite build` |
| **Output Directory** | `dist` |
| **Install Command** | `pnpm install` (or `npm install`) |

### Step 3: Set Environment Variable

In Vercel → Project Settings → Environment Variables:

| Key | Value | Example |
|-----|-------|---------|
| `VITE_ML_BACKEND_URL` | Your Render backend URL | `https://retinavision-ml-backend.onrender.com` |

### Step 4: Deploy

Click **"Deploy"**. Vercel will build and deploy your frontend.

The frontend will be available at: `https://retinavision-ai.vercel.app` (or your custom domain)

---

## Part 3: Connect Frontend to Backend

After both services are deployed:

1. Copy your Render backend URL (e.g., `https://retinavision-ml-backend.onrender.com`)
2. Set it as `VITE_ML_BACKEND_URL` in Vercel's environment variables
3. Redeploy the frontend on Vercel
4. The app will now use real AI inference!

---

## Part 4: Verify Everything Works

### Test the ML Backend

```bash
# Health check
curl https://your-render-url.onrender.com/health

# Expected response:
# {"status":"healthy","model":"EfficientNet-B0","device":"cpu","classes":6}

# Model info
curl https://your-render-url.onrender.com/model-info

# Expected: model metadata with class names and preprocessing info
```

### Test Inference (with a real image)

```bash
# Send a retinal image for prediction
curl -X POST https://your-render-url.onrender.com/predict \
  -F "image=@/path/to/retina.jpg"

# Expected: JSON with prediction, confidence, diagnosis, and Grad-CAM base64 image
```

### Test the Full Stack

1. Open your Vercel URL
2. Navigate to the dashboard (Login if required)
3. Go to **Image Analysis**
4. Upload a retinal image
5. Click **"Analyze Image"**
6. Verify you get a real prediction with confidence score and Grad-CAM heatmap

---

## Environment Variable Reference

### ML Backend (Render)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port (Render sets this) | `10000` |
| `MODEL_PATH` | Path to the model weights file | `best_model.pth` |
| `DEVICE` | `cpu` or `cuda` | `cpu` |

### Frontend (Vercel)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_ML_BACKEND_URL` | Full URL of the deployed ML backend | **Yes** |

Example: `VITE_ML_BACKEND_URL=https://retinavision-ml-backend.onrender.com`

---

## Troubleshooting

### Frontend shows "Backend Required"

- Make sure `VITE_ML_BACKEND_URL` is set in Vercel environment variables
- Redeploy after setting the variable
- Check that the URL has no trailing slash

### ML Backend takes too long to respond

- Render free tier spins down after 15 minutes of inactivity
- First request after idle will take 30-60 seconds (cold start)
- Upgrade to Render Starter ($7/mo) for always-on

### Model not loading

- Verify `best_model.pth` is committed to the repo root
- Check Render logs for: "Model weights loaded successfully"
- Ensure the model is EfficientNet-B0 with 6 output classes

### CORS errors

- The Flask backend already has CORS enabled (`CORS(app)`)
- No additional configuration needed

---

## File Structure for Deployment

```
RetinaVision-AI/
├── best_model.pth          ← Model weights (required in repo root)
├── vercel.json             ← Vercel frontend config
├── DEPLOYMENT_GUIDE.md     ← This file
├── ml-backend/
│   ├── app.py              ← Flask ML server
│   ├── Dockerfile          ← Render Docker config
│   ├── render.yaml         ← Render blueprint (alternative)
│   ├── requirements.txt    ← Python dependencies
│   ├── Procfile            ← Alternative start command
│   ├── test_model.py       ← Verification script
│   ├── inspect_model.py    ← Model inspection script
│   └── PREPROCESSING_VERIFICATION.md
├── client/                 ← React frontend (deployed to Vercel)
├── server/                 ← tRPC backend (optional, for auth)
└── package.json            ← Frontend dependencies
```
