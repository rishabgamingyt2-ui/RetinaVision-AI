"""
RetinaVision AI — ML Inference Backend
EfficientNet-B0 model for retinal disease detection with Grad-CAM visualization.
Deploy on Render, Heroku, or any WSGI host.
"""

import os
import io
import base64
import logging
import threading
import time
from PIL import Image
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
import torchvision.models as models
from flask import Flask, request, jsonify
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_PORT = int(os.environ.get("PORT", 8000))
MODEL_PATH = os.environ.get("MODEL_PATH")
if MODEL_PATH:
    MODEL_PATH = os.path.abspath(
        MODEL_PATH
        if os.path.isabs(MODEL_PATH)
        else os.path.join(BASE_DIR, MODEL_PATH)
    )
else:
    MODEL_PATH = os.path.join(BASE_DIR, "best_model.pth")
DEVICE = os.environ.get("DEVICE", "cpu")
CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,"
    "https://retinaiapp-7xguqjmt.manus.space,"
    "https://*.manus.space"
)

if CORS_ORIGINS.strip() == "*":
    ALLOWED_ORIGINS = "*"
else:
    _explicit = [
        origin.strip()
        for origin in CORS_ORIGINS.split(",")
        if origin.strip() and not origin.strip().startswith("*")
    ]

    def _origin_allowed(origin):
        """Allow explicit origins plus wildcard domain patterns like https://*.manus.space."""
        if not origin:
            return False
        if origin in _explicit:
            return True
        for pattern in CORS_ORIGINS.split(","):
            pattern = pattern.strip()
            if pattern == "*":
                return True
            if "*" in pattern:
                # e.g. "https://*.manus.space" -> suffix ".manus.space",
                # accept origin with same scheme and matching domain suffix
                try:
                    scheme, rest = pattern.split("://", 1)
                except ValueError:
                    continue
                if not origin.startswith(scheme + "://"):
                    continue
                suffix = rest.split("*", 1)[-1]  # ".manus.space"
                if suffix and origin[len(scheme) + 3:].endswith(suffix):
                    return True
        return False

    ALLOWED_ORIGINS = _explicit

# ---------------------------------------------------------------------------
# Flask App + Health Check (created EARLY so Render's health check passes
# immediately, before the heavy PyTorch model load completes)
# ---------------------------------------------------------------------------
app = Flask(__name__)

# ---------------------------------------------------------------------------
# CORS — applied right after the Flask app object exists
# ---------------------------------------------------------------------------
if CORS_ORIGINS.strip() == "*":
    ALLOWED_ORIGINS = "*"
    CORS(app, resources={r"/*": {"origins": "*"}})
else:
    CORS(app, resources={r"/*": {"origins": _origin_allowed}})

MODEL_READY = False
MODEL_ERROR = None


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint. Responds immediately — even while the model
    is still loading — so Render's internal health check can pass.
    model_ready indicates whether inference is available yet."""
    if MODEL_READY:
        status = "healthy"
    elif MODEL_ERROR:
        status = "degraded"
    else:
        status = "loading"
    return jsonify({
        "status": status,
        "model_ready": MODEL_READY,
        "model": "EfficientNet-B0",
        "device": DEVICE,
        "classes": len(CLASS_NAMES),
    })

CLASS_NAMES = [
    "Normal",
    "Diabetic Retinopathy",
    "Glaucoma",
    "Cataract",
    "Age-related Macular Degeneration",
    "Retinal Detachment",
]

# Medical descriptions for each class
CLASS_INFO = {
    "Normal": {
        "severity": "Low",
        "color": "#10b981",
        "description": "The retina appears healthy with no signs of disease. Blood vessels, optic disc, and macula are within normal limits.",
        "recommendation": "Continue regular annual eye examinations. Maintain a healthy lifestyle to preserve retinal health.",
    },
    "Diabetic Retinopathy": {
        "severity": "High",
        "color": "#ef4444",
        "description": "Damage to retinal blood vessels caused by prolonged diabetes. May present with microaneurysms, hemorrhages, hard exudates, or neovascularization.",
        "recommendation": "Immediate referral to a retinal specialist. Urgent glycemic control consultation with endocrinology. Consider anti-VEGF therapy or pan-retinal photocoagulation.",
    },
    "Glaucoma": {
        "severity": "High",
        "color": "#ef4444",
        "description": "Progressive optic neuropathy characterized by optic disc cupping and retinal nerve fiber layer thinning. May cause irreversible vision loss.",
        "recommendation": "Urgent intraocular pressure measurement. Initiate topical IOP-lowering therapy. Visual field testing and OCT recommended.",
    },
    "Cataract": {
        "severity": "Medium",
        "color": "#f59e0b",
        "description": "Opacification of the crystalline lens, causing reduced visual acuity and glare sensitivity. May be age-related, congenital, or secondary.",
        "recommendation": "Schedule phacoemulsification surgery if visual impairment is significant. Monitor progression with slit-lamp examination.",
    },
    "Age-related Macular Degeneration": {
        "severity": "High",
        "color": "#ef4444",
        "description": "Degenerative changes in the macula, including drusen, geographic atrophy, or choroidal neovascularization. Leading cause of vision loss in adults over 60.",
        "recommendation": "Refer to retina specialist. Consider anti-VEGF intravitreal injections for wet AMD. AREDS2 vitamin supplementation for dry AMD.",
    },
    "Retinal Detachment": {
        "severity": "Critical",
        "color": "#dc2626",
        "description": "Separation of the neurosensory retina from the underlying retinal pigment epithelium. A medical emergency requiring immediate intervention.",
        "recommendation": "EMERGENCY: Immediate surgical consultation required. Pars plana vitrectomy or scleral buckling may be indicated. Time-sensitive — vision loss risk increases hourly.",
    },
}

# ---------------------------------------------------------------------------
# Model Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_model():
    """Load the EfficientNet-B0 model with trained weights."""
    logger.info("Loading EfficientNet-B0 model from %s...", MODEL_PATH)

    # Create the model architecture (EfficientNet-B0 with 6 output classes)
    model = models.efficientnet_b0(weights=None)
    num_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_features, len(CLASS_NAMES))

    # Load trained weights
    if os.path.exists(MODEL_PATH):
        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
        # Handle different checkpoint formats
        if "state_dict" in checkpoint:
            model.load_state_dict(checkpoint["state_dict"])
        elif "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        else:
            model.load_state_dict(checkpoint)
        logger.info("Model weights loaded successfully.")
    else:
        logger.warning(
            "Model file '%s' not found. Using random weights. "
            "Upload best_model.pth to the project root before deployment.",
            MODEL_PATH,
        )

    model.to(DEVICE)
    model.eval()
    logger.info("Model ready for inference on %s.", DEVICE)
    return model


# ---------------------------------------------------------------------------
# Model Loading — run in a background thread after the Flask app exists,
# so /health responds immediately on Render's internal health check.
# ---------------------------------------------------------------------------
def _init_model_in_background():
    global model, gradcam, MODEL_READY, MODEL_ERROR
    try:
        t0 = time.time()
        model = load_model()
        gradcam = GradCAM(model)
        MODEL_READY = True
        logger.info(
            "Model initialization complete in %.1fs; inference is now live.",
            time.time() - t0,
        )
    except Exception as exc:  # noqa: BLE001
        MODEL_ERROR = str(exc)
        logger.exception("Failed to load model: %s", exc)


model = None
gradcam = None
threading.Thread(target=_init_model_in_background, daemon=True).start()

# ---------------------------------------------------------------------------
# Image Preprocessing (matches training pipeline)
# ---------------------------------------------------------------------------
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def preprocess_image(pil_img: Image.Image) -> torch.Tensor:
    """Preprocess a PIL image for EfficientNet-B0 inference."""
    img = pil_img.convert("RGB")
    img = transform(img)
    return img.unsqueeze(0)  # Add batch dimension


# ---------------------------------------------------------------------------
# Grad-CAM Implementation
# ---------------------------------------------------------------------------
class GradCAM:
    """
    Gradient-weighted Class Activation Mapping for EfficientNet-B0.
    Uses the last convolutional layer (features.8) for heatmap generation.
    """

    def __init__(self, model, target_layer_name="features.8"):
        self.model = model
        self.gradients = None
        self.activations = None
        self.target_layer = None

        # Register hooks on the target layer
        for name, module in model.named_modules():
            if name == target_layer_name:
                self.target_layer = module
                break

        if self.target_layer is None:
            raise ValueError(f"Target layer '{target_layer_name}' not found in model")

        # Register forward and backward hooks
        self.target_layer.register_forward_hook(self._forward_hook)
        self.target_layer.register_full_backward_hook(self._backward_hook)

    def _forward_hook(self, module, input, output):
        self.activations = output.detach()

    def _backward_hook(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, input_tensor, target_class_idx):
        """
        Generate Grad-CAM heatmap for the given input and target class.

        Args:
            input_tensor: Preprocessed image tensor [1, 3, 224, 224]
            target_class_idx: Index of the target class

        Returns:
            Heatmap as numpy array (224, 224), normalized to [0, 1]
        """
        # Zero gradients
        self.model.zero_grad()

        # Forward pass
        output = self.model(input_tensor)

        # Backward pass on target class score
        score = output[0, target_class_idx]
        score.backward()

        # Get gradients and activations
        gradients = self.gradients  # [1, C, H, W]
        activations = self.activations  # [1, C, H, W]

        # Global average pooling of gradients
        weights = torch.mean(gradients, dim=(2, 3), keepdim=True)  # [1, C, 1, 1]

        # Weighted combination of activations
        cam = torch.sum(weights * activations, dim=1, keepdim=True)  # [1, 1, H, W]

        # ReLU to keep only positive contributions
        cam = F.relu(cam)

        # Normalize to [0, 1]
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

        return cam


def create_gradcam_visualization(original_img, heatmap, alpha=0.5):
    """
    Overlay Grad-CAM heatmap on the original image.

    Args:
        original_img: Original PIL Image
        heatmap: 2D numpy array normalized to [0, 1]
        alpha: Opacity of the heatmap overlay

    Returns:
        PIL Image with heatmap overlay
    """
    # Resize heatmap to match original image
    from PIL import Image as PILImage

    pil_heatmap = PILImage.fromarray((heatmap * 255).astype(np.uint8))
    pil_heatmap = pil_heatmap.resize(original_img.size, PILImage.BILINEAR)
    heatmap_resized = np.array(pil_heatmap) / 255.0

    # Create a color overlay using jet colormap approximation
    # Blue (low) -> Green (mid) -> Red (high)
    overlay = np.zeros((*original_img.size[::-1], 3), dtype=np.uint8)
    overlay[..., 0] = (heatmap_resized * 255).astype(np.uint8)  # Red channel = heatmap
    overlay[..., 1] = (heatmap_resized * 128).astype(np.uint8)  # Green = half
    overlay[..., 2] = ((1 - heatmap_resized) * 255).astype(np.uint8)  # Blue = inverse

    # Blend original image with heatmap
    original_array = np.array(original_img).astype(np.float32)
    overlay_float = overlay.astype(np.float32)

    blended = (1 - alpha) * original_array + alpha * overlay_float
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    return PILImage.fromarray(blended)


# ---------------------------------------------------------------------------
# Flask Routes
# ---------------------------------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    """
    Main inference endpoint.

    Accepts: multipart/form-data with 'image' file field
    Returns: JSON with prediction, confidence, diagnosis, and Grad-CAM image
    """
    if not MODEL_READY:
        return jsonify({
            "error": "Model is still loading. Please retry in a moment."
        }), 503

    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use 'image' field."}), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    # Validate file type
    allowed_extensions = {"png", "jpg", "jpeg", "bmp", "tiff", "tif"}
    ext = image_file.filename.rsplit(".", 1)[-1].lower() if "." in image_file.filename else ""
    if ext not in allowed_extensions:
        return jsonify({"error": f"Unsupported file type: {ext}. Allowed: {allowed_extensions}"}), 400

    try:
        # Open and preprocess the image
        img = Image.open(io.BytesIO(image_file.read()))

        # Keep original for visualization
        original_img = img.copy()
        original_img = original_img.resize((512, 512), Image.LANCZOS)

        # Preprocess for inference
        input_tensor = preprocess_image(img).to(DEVICE)

        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)

        confidence_val = confidence.item()
        predicted_idx = predicted_idx.item()
        disease_name = CLASS_NAMES[predicted_idx]
        disease_info = CLASS_INFO[disease_name]

        # Get all class probabilities
        all_probs = probabilities[0].cpu().numpy()
        class_probabilities = {
            name: float(prob)
            for name, prob in zip(CLASS_NAMES, all_probs)
        }

        # Generate Grad-CAM heatmap
        heatmap = gradcam.generate(input_tensor, predicted_idx)
        heatmap_img = create_gradcam_visualization(original_img, heatmap, alpha=0.45)

        # Encode heatmap image to base64
        heatmap_buffer = io.BytesIO()
        heatmap_img.save(heatmap_buffer, format="PNG", quality=85)
        heatmap_base64 = base64.b64encode(heatmap_buffer.getvalue()).decode("utf-8")

        # Also encode the original uploaded image for display
        original_buffer = io.BytesIO()
        original_img.save(original_buffer, format="PNG", quality=85)
        original_base64 = base64.b64encode(original_buffer.getvalue()).decode("utf-8")

        # Build the diagnosis
        diagnosis = {
            "disease": disease_name,
            "confidence": confidence_val,
            "severity": disease_info["severity"],
            "description": disease_info["description"],
            "recommendation": disease_info["recommendation"],
            "severity_color": disease_info["color"],
        }

        response = {
            "success": True,
            "prediction": disease_name,
            "confidence": round(confidence_val, 4),
            "confidence_percentage": round(confidence_val * 100, 2),
            "class_probabilities": class_probabilities,
            "diagnosis": diagnosis,
            "gradcam": f"data:image/png;base64,{heatmap_base64}",
            "original_image": f"data:image/png;base64,{original_base64}",
            "model_info": {
                "architecture": "EfficientNet-B0",
                "num_classes": len(CLASS_NAMES),
                "classes": CLASS_NAMES,
                "device": DEVICE,
            },
        }

        logger.info(
            "Prediction: %s (%.2f%%) — Heatmap generated",
            disease_name,
            confidence_val * 100,
        )

        return jsonify(response)

    except Exception as e:
        logger.error("Inference error: %s", str(e), exc_info=True)
        return jsonify({"error": f"Inference failed: {str(e)}"}), 500


@app.route("/model-info", methods=["GET"])
def model_info():
    """Return model metadata."""
    return jsonify({
        "architecture": "EfficientNet-B0",
        "num_classes": len(CLASS_NAMES),
        "classes": CLASS_NAMES,
        "class_info": CLASS_INFO,
        "input_size": "224x224",
        "preprocessing": {
            "resize": "224x224",
            "mean": IMAGENET_MEAN,
            "std": IMAGENET_STD,
        },
    })


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting RetinaVision ML Backend on port %d...", APP_PORT)
    app.run(host="0.0.0.0", port=APP_PORT, debug=False)
