# Model Weights Placeholder

This directory expects a file named **`best_model.pth`** — your trained PyTorch EfficientNet-B0 model weights.

## What to do

1. Copy your trained model file here:
   ```bash
   cp /path/to/your/best_model.pth ml-backend/best_model.pth
   ```

2. The model must be an **EfficientNet-B0** with exactly **6 output classes** in this order:

   | Index | Class |
   |-------|-------|
   | 0 | Normal |
   | 1 | Diabetic Retinopathy |
   | 2 | Glaucoma |
   | 3 | Cataract |
   | 4 | Age-related Macular Degeneration |
   | 5 | Retinal Detachment |

3. If your model uses a different checkpoint format, the app handles:
   - Plain `state_dict` (the entire file is the model state)
   - Dict with `"state_dict"` key
   - Dict with `"model_state_dict"` key

4. Commit this file to your Git repo so it's included in the Docker build.

## Without this file

The Flask server will start but will use **random weights** — predictions will be meaningless.
You'll see a warning in the server logs:
```
WARNING: Model file 'best_model.pth' not found. Using random weights.
Upload best_model.pth to the project root before deployment.
```

## If your model uses different preprocessing

The app uses standard ImageNet normalization:
- Resize: 224×224
- Mean: [0.485, 0.456, 0.406]  
- Std: [0.229, 0.224, 0.225]

If your training used different transforms, edit `app.py` to match exactly.
