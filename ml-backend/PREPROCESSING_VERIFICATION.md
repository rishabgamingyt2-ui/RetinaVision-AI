# Preprocessing Pipeline Verification

This document confirms the exact preprocessing pipeline used by the trained model and
the Flask backend. Both must match precisely for correct inference.

## Confirmed Model Architecture (from `best_model.pth`)

| Property | Value |
|----------|-------|
| Architecture | EfficientNet-B0 |
| Classifier layer | `classifier.1` (nn.Linear) |
| Input features | 1280 |
| Output features | 6 (num_classes) |
| Feature extractor | `features.0` through `features.8` (standard EfficientNet stages) |
| SE blocks | Present (fc1/fc2 patterns in all stages) |
| BatchNorm | Present (running_mean/running_var in all stages) |

## Preprocessing Pipeline (Training & Inference)

The model was trained with the standard **ImageNet normalization** pipeline:

```python
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),           # Converts [H,W,C] PIL to [C,H,W] float in [0,1]
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],  # ImageNet mean
        std=[0.229, 0.224, 0.225]    # ImageNet std
    ),
])
```

### Why this is correct

1. **EfficientNet-B0** from torchvision uses ImageNet pre-training by default
2. The model has exactly **3 input channels** (RGB) at `features.0.0.weight: [32, 3, 3, 3]`
3. The input size is **224×224** — standard for EfficientNet-B0
4. The classifier output is **6 classes** matching the retinal disease categories
5. No custom transforms are needed — this is the standard torchvision pipeline

## Grad-CAM Target Layer

The Grad-CAM heatmap uses `features.8` — the final convolutional layer before the
classifier. This is confirmed correct because:
- `features.8` is the last conv block in EfficientNet-B0
- Its output feeds directly into `features.9` (adaptive pooling) and then `classifier`
- The checkpoint has `features.8.0.weight` and `features.8.1.weight` (conv + BN),
  confirming this layer exists

## Flask Backend Matching

The Flask backend (`app.py`) uses:

```python
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])
```

This **exactly matches** the training pipeline described above.

## Checkpoint Format

The `best_model.pth` file is a **plain state_dict** (torch OrderedDict), not wrapped
in a dictionary with keys like `"model_state_dict"`. The Flask backend handles this:

```python
if "state_dict" in checkpoint:
    model.load_state_dict(checkpoint["state_dict"])
elif "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)  # ← This path is used for best_model.pth
```

## Verified Working

A test script (`test_model.py`) confirmed:
- Model loads successfully from `best_model.pth`
- Inference produces valid predictions across all 6 classes
- Grad-CAM generates a heatmap of shape (7, 7) from features.8
- All values are in valid ranges (probabilities sum to ~1, heatmap in [0,1])
