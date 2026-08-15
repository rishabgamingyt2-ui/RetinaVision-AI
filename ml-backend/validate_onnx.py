import torch, torchvision, numpy as np, onnxruntime as ort

model = torchvision.models.efficientnet_b0(weights=None, num_classes=6)
model.load_state_dict(torch.load("best_model.pth", map_location="cpu", weights_only=True))
model.eval()

x = torch.randn(2, 3, 224, 224)
with torch.no_grad():
    torch_logits = model(x).numpy()

sess = ort.InferenceSession("best_model.onnx", providers=["CPUExecutionProvider"])
ort_logits = sess.run(["logits"], {"input": x.numpy().astype(np.float32)})[0]
print("main graph diff max:", np.abs(torch_logits - ort_logits).max())

sess2 = ort.InferenceSession("best_model_features.onnx", providers=["CPUExecutionProvider"])
ort_l, ort_f = sess2.run(["logits", "features"], {"input": x.numpy().astype(np.float32)})
print("features graph logits diff max:", np.abs(torch_logits - ort_l).max(), "features shape:", ort_f.shape)

# Softmax confidence check
p = torch.softmax(torch.from_numpy(ort_logits[0]), dim=0).numpy()
print("top class:", p.argmax(), "conf:", p.max())
