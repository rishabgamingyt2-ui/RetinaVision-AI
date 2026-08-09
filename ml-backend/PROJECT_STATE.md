# RetinaVision AI — Project State

## Current Task (In Progress)
Connecting real trained model to the app, removing mocks, preparing Render + Vercel deployment.

## Key Facts

### GitHub Repo
- Repo: `rishabgamingyt2-ui/RetinaVision-AI`
- Branch: `main`
- Model file: `best_model.pth` at repo ROOT (16MB)
- NO training notebook found in repo — user trained model externally

### Model Details (confirmed via inspection)
- Architecture: EfficientNet-B0 (torchvision)
- Classifier: `classifier.1` = nn.Linear(1280, 6)
- Output classes: 6 (Normal, Diabetic Retinopathy, Glaucoma, Cataract, AMD, Retinal Detachment)
- Checkpoint format: Plain OrderedDict state_dict (NOT wrapped in dict)
- Preprocessing: ImageNet normalization, 224x224 resize
- Grad-CAM target: `features.8`

### Files Created/Modified This Session
1. `ml-backend/app.py` — Flask server (already correct, no changes needed)
2. `ml-backend/best_model.pth` — Downloaded from GitHub
3. `ml-backend/test_model.py` — Verified model works end-to-end
4. `ml-backend/inspect_model.py` — Model inspection script
5. `ml-backend/PREPROCESSING_VERIFICATION.md` — Confirms preprocessing matches
6. `ml-backend/Dockerfile` — Updated to handle best_model.pth at repo root
7. `ml-backend/render.yaml` — Updated dockerContext to "." (repo root)
8. `vercel.json` — Vercel frontend config
9. `DEPLOYMENT_GUIDE.md` — Comprehensive deployment instructions

### Frontend Changes
- Removed `getSimulatedResult()` function entirely
- Removed simulated fallback in `handleAnalyze` — now throws error requiring ML backend
- Updated UI: "Backend Required" badge, "Connect ML Backend" button state
- Warning banner updated (no longer says "Simulated Mode")

### Remaining TODOs
- [ ] Wire frontend to call real backend API end-to-end (done — was already wired)
- [ ] Prepare Render + Vercel configs (done)
- [ ] Test end-to-end (need to verify TypeScript compiles)
- [ ] Save checkpoint

### Important Notes
- Manus WebDev hosting CANNOT run PyTorch (1 vCPU, 512MB, 300s build limit)
- Architecture: Frontend (Vercel) → Flask Backend (Render)
- Frontend env var: `VITE_ML_BACKEND_URL` must point to Render URL
- The `ml-backend/` directory contains the Flask app but is NOT part of the Vite build
- Vercel builds from repo root with `vite build` → outputs to `dist`
- Render builds Docker image from repo root, runs `ml-backend/Dockerfile`
