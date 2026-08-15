"""Export best_model.pth (EfficientNet-B0, plain state_dict) to ONNX format.

Also exports a secondary graph that outputs the final conv feature map (before
global average pooling), which the Node server uses with score-weighted
activation (Score-CAM style) to produce Grad-CAM-like heatmaps without gradients.
"""
import torch
import torchvision
from torchvision.models import EfficientNet_B0_Weights

# ---------------- Load the trained weights ----------------
ckpt_path = "/home/ubuntu/retinavision-ai/ml-backend/best_model.pth"
model = torchvision.models.efficientnet_b0(weights=None, num_classes=6)
state = torch.load(ckpt_path, map_location="cpu", weights_only=True)
model.load_state_dict(state)
model.eval()

# ---------------- Export main prediction graph ----------------
dummy = torch.randn(1, 3, 224, 224)
main_path = "/home/ubuntu/retinavision-ai/ml-backend/best_model.onnx"
torch.onnx.export(
    model,
    dummy,
    main_path,
    opset_version=17,
    input_names=["input"],
    output_names=["logits"],
    dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
    embed_large_constants=True,
)
print("main graph exported:", main_path)

# ---------------- Export feature-map graph for heatmap (Score-CAM style) ----------------

class FeatureExtractor(torch.nn.Module):
    """EfficientNet-B0 up to the last MBConv block (features), returning the
    pre-GAP feature map."""

    def __init__(self):
        super().__init__()
        base = torchvision.models.efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        self.features = base.features

    def forward(self, x):
        return self.features(x)  # [B, 1280, 7, 7]


class HeatmapModel(torch.nn.Module):
    """Features + classifier, returns (logits, feature_map) so the Node server
    can compute score-weighted class activation maps."""

    def __init__(self):
        super().__init__()
        self.features = FeatureExtractor().features
        self.avgpool = torch.nn.AdaptiveAvgPool2d(1)
        self.classifier = torch.nn.Sequential(
            torch.nn.Dropout(p=0.2),
            torch.nn.Linear(1280, 6),
        )

    def forward(self, x):
        f = self.features(x)
        gap = self.avgpool(f).flatten(1)
        logits = self.classifier(gap)
        return logits, f


# Load the trained state_dict into the wrapper: state keys "features.*" and
# "classifier.*" match the HeatmapModel module layout directly.
wrapper = HeatmapModel()
wrapper.load_state_dict(state)
wrapper.eval()

feat_path = "/home/ubuntu/retinavision-ai/ml-backend/best_model_features.onnx"
torch.onnx.export(
    wrapper,
    dummy,
    feat_path,
    opset_version=17,
    input_names=["input"],
    output_names=["logits", "features"],
    dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}, "features": {0: "batch"}},
    embed_large_constants=True,
)
print("feature graph exported:", feat_path)

# ---------------- Validate ----------------
import numpy as np

onnx_inputs = {
    "input": dummy.numpy().astype(np.float32),
}
try:
    import onnxruntime as ort

    for path, outputs in [(main_path, ["logits"]), (feat_path, ["logits", "features"])]:
        sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        out = sess.run(outputs, onnx_inputs)
        print(f"{path}: logits={out[0].shape}", end="")
        if len(out) > 1:
            print(f" features={out[1].shape}")
        else:
            print()
    print("ONNX runtime validation OK")
except ImportError:
    print("onnxruntime not installed; skipping runtime validation")
