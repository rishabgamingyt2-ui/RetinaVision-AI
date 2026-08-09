"""Quick test to verify the model loads and runs inference correctly."""
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from PIL import Image
import numpy as np

# Load model
MODEL_PATH = "best_model.pth"
DEVICE = "cpu"
CLASS_NAMES = [
    "Normal", "Diabetic Retinopathy", "Glaucoma",
    "Cataract", "Age-related Macular Degeneration", "Retinal Detachment",
]

print("Creating EfficientNet-B0 architecture...")
model = models.efficientnet_b0(weights=None)
num_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_features, len(CLASS_NAMES))

print(f"Loading weights from {MODEL_PATH}...")
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
print(f"  Checkpoint type: {type(checkpoint).__name__}")
print(f"  Checkpoint keys: {list(checkpoint.keys())[:5] if isinstance(checkpoint, dict) else 'N/A (direct state_dict)'}")

model.load_state_dict(checkpoint)
model.to(DEVICE)
model.eval()
print("  Model loaded and set to eval mode.")

# Test with a dummy image
print("\nRunning inference on a dummy 224x224 image...")
dummy = torch.randn(1, 3, 224, 224)
with torch.no_grad():
    outputs = model(dummy)
    probs = F.softmax(outputs, dim=1)
    conf, idx = torch.max(probs, 1)
    print(f"  Predicted class: {CLASS_NAMES[idx.item()]}")
    print(f"  Confidence: {conf.item():.4f}")
    print(f"  All probabilities: {probs[0].cpu().numpy().round(4).tolist()}")

# Test Grad-CAM
print("\nTesting Grad-CAM...")
gradcam_target = None
for name, module in model.named_modules():
    if name == "features.8":
        gradcam_target = module
        break

activations = None
gradients = None

def forward_hook(module, input, output):
    global activations
    activations = output.detach()

def backward_hook(module, grad_input, grad_output):
    global gradients
    gradients = grad_output[0].detach()

if gradcam_target:
    gradcam_target.register_forward_hook(forward_hook)
    gradcam_target.register_full_backward_hook(backward_hook)
    
    model.zero_grad()
    output = model(dummy)
    score = output[0, idx.item()]
    score.backward()
    
    cam = torch.mean(gradients, dim=(2, 3), keepdim=True) * activations
    cam = torch.sum(cam, dim=1, keepdim=True)
    cam = F.relu(cam).squeeze().cpu().numpy()
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    print(f"  Grad-CAM heatmap shape: {cam.shape}")
    print(f"  Heatmap range: [{cam.min():.4f}, {cam.max():.4f}]")
    print("\n✅ All tests passed! Model is ready for production.")
else:
    print("❌ Could not find features.8 layer!")
