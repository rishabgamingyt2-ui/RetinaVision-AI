import torch
import sys

print("=== Inspecting best_model.pth ===\n")

# Load checkpoint
checkpoint = torch.load("best_model.pth", map_location="cpu", weights_only=False)

# Check if it's a dict or direct state_dict
if isinstance(checkpoint, dict):
    print("Checkpoint is a dictionary with keys:", list(checkpoint.keys()))
    print()
    
    # Check for common model state dict keys
    if "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
        print("'model_state_dict' found, keys count:", len(state_dict))
    elif "state_dict" in checkpoint:
        state_dict = checkpoint["state_dict"]
        print("'state_dict' found, keys count:", len(state_dict))
    else:
        # Check if it looks like a model state dict directly
        for k, v in list(checkpoint.items())[:5]:
            print(f"  Key: {k}, Type: {type(v).__name__}, Shape: {getattr(v, 'shape', 'N/A')}")
        state_dict = checkpoint
    
    # Check for epoch, optimizer, etc
    for k in checkpoint.keys():
        v = checkpoint[k]
        if k in ("epoch", "optimizer", "loss", "accuracy", "class_names", "classes"):
            print(f"\n'{k}': {v}")
else:
    print("Checkpoint is directly a state_dict")
    state_dict = checkpoint
    print("Number of keys:", len(state_dict))

# Try to figure out the architecture
print("\n=== Looking for architecture clues ===")
model_keys = list(state_dict.keys())

# Check if it's an EfficientNet
efficientnet_keys = [k for k in model_keys if "features" in k or "classifier" in k]
print(f"Keys containing 'features' or 'classifier': {len(efficientnet_keys)}")
if efficientnet_keys[:5]:
    print("  Sample:", efficientnet_keys[:5])

# Check for efficientnet_b0 specific patterns
b0_patterns = [k for k in model_keys if "blocks" in k or "head" in k]
print(f"Keys containing 'blocks' or 'head': {len(b0_patterns)}")

# Check classifier/fc layer for output features
classifier_keys = [k for k in model_keys if "classifier" in k.lower() or "fc" in k.lower() or "last_linear" in k.lower()]
print(f"\nClassifier/FC layer keys:")
for k in classifier_keys:
    print(f"  {k}: {state_dict[k].shape}")

# Check the final layer shape to determine number of classes
for k in reversed(model_keys):
    if "weight" in k and state_dict[k].ndim == 2:
        out_features = state_dict[k].shape[0]
        in_features = state_dict[k].shape[1]
        print(f"\n=== FINAL LAYER: {k} ===")
        print(f"  Shape: {state_dict[k].shape}")
        print(f"  Output features (num classes): {out_features}")
        print(f"  Input features: {in_features}")
        break

# Check for class names in checkpoint
for k in checkpoint.keys():
    if isinstance(checkpoint[k], (list, tuple)):
        if k.lower() in ("classes", "class_names", "class_to_idx"):
            print(f"\n{k}: {checkpoint[k]}")

print("\n=== Done ===")
