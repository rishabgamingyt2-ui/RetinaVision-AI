# Project State

## Current Status
- The frontend now uses same-origin `/api/ml` proxy (defaults to this, falls back to VITE_ML_BACKEND_URL if set)
- The server has `registerMLProxy()` in `server/_core/mlProxy.ts` that forwards `/api/ml/*` to Flask backend at `http://localhost:8000`
- Flask backend is in `ml-backend/` directory with `best_model.pth` (16MB EfficientNet-B0, 6 classes)
- The fix for RGBA images has been applied and pushed to GitHub

## Key Files
- `server/_core/mlProxy.ts` — Express proxy for /api/ml/* → Flask backend
- `server/_core/index.ts` — Registers mlProxy alongside storageProxy and OAuth
- `client/src/pages/ImageAnalysis.tsx` — Uses `/api/ml/health` and `/api/ml/predict` by default
- `ml-backend/app.py` — Flask server with EfficientNet-B0, Grad-CAM, 6 disease classes
- `ml-backend/best_model.pth` — Trained model weights

## How to Test
1. Start Flask: `cd ml-backend && PORT=8000 python3 app.py`
2. Open browser at localhost:3000/dashboard/analysis
3. Upload image → click "Analyze Image"
4. Should work end-to-end via the proxy

## Deployment Notes
- Render: use `ml-backend/render.yaml` blueprint
- Vercel: set VITE_ML_BACKEND_URL to the Render URL
- The /api/ml proxy is for local dev only; deployed frontend needs VITE_ML_BACKEND_URL set to the Render URL
