import onnx
from onnx import TensorProto
from onnx import external_data_helper

for name in ["best_model.onnx", "best_model_features.onnx"]:
    model = onnx.load(name, load_external_data=False)
    ext = [t for t in model.graph.initializer if t.data_location == TensorProto.EXTERNAL]
    print(name, "external initializers:", len(ext))
    for t in ext:
        external_data_helper.load_external_data_for_tensor(t, ".")
        t.ClearField("data_location")
        t.ClearField("external_data")
    # also check sparse tensors / other graphs
    out = name.replace(".onnx", "_inline.onnx")
    onnx.save(model, out)
    print("saved", out)
