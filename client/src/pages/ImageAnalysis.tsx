/*
 * ImageAnalysis — Core analysis page with upload, real EfficientNet-B0 prediction,
 * Grad-CAM visualization, and medical report.
 * Style: Clinical Nebula — glassmorphism cards, animated probability bars
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Brain,
  ShieldCheck,
  Info,
  X,
  Zap,
  Loader2,
  FileText,
  Thermometer,
  Server,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Direct browser calls to the Render ML backend (Option C):
// https://retinavision-ml-backend.onrender.com
import { checkMlHealth, effectiveMlBackend, markMlBackendUnreachable, markMlBackendReachable, mlFetch } from "@/lib/mlClient";

// Disease classes the model predicts
const diseaseClasses = [
  "Normal",
  "Diabetic Retinopathy",
  "Glaucoma",
  "Cataract",
  "Age-related Macular Degeneration",
  "Retinal Detachment",
];

// Medical information for each class
const diseaseInfo: Record<string, {
  description: string;
  symptoms: string[];
  recommendedAction: string;
  emergencyLevel: string;
  treatment: string;
}> = {
  Normal: {
    description: "The retina appears healthy with no signs of disease or abnormality. All retinal structures including the optic disc, macula, and blood vessels appear within normal limits.",
    symptoms: ["No visual impairment", "No retinal abnormalities detected", "Clear fundus examination"],
    recommendedAction: "Routine eye examination every 1-2 years is recommended for maintaining eye health.",
    emergencyLevel: "Low",
    treatment: "No treatment required. Continue regular eye health monitoring.",
  },
  "Diabetic Retinopathy": {
    description: "Damage to retinal blood vessels caused by prolonged diabetes. May present with microaneurysms, hemorrhages, hard exudates, or neovascularization. Leading cause of blindness in working-age adults.",
    symptoms: ["Blurred vision", "Floaters or dark spots", "Impaired color vision", "Sudden vision loss", "Fluctuating vision"],
    recommendedAction: "Immediate referral to a retinal specialist. Urgent glycemic control consultation with endocrinology. Consider anti-VEGF therapy or pan-retinal photocoagulation.",
    emergencyLevel: "High",
    treatment: "Anti-VEGF intravitreal injections, pan-retinal photocoagulation laser therapy, vitrectomy for advanced cases. Strict glycemic control.",
  },
  Glaucoma: {
    description: "Progressive optic neuropathy characterized by optic disc cupping and retinal nerve fiber layer thinning. Elevated intraocular pressure damages the optic nerve, causing irreversible peripheral vision loss.",
    symptoms: ["Gradual loss of peripheral vision", "Eye pain or headache", "Halos around lights", "Redness of the eye", "Nausea with eye pain"],
    recommendedAction: "Urgent intraocular pressure measurement. Initiate topical IOP-lowering therapy. Visual field testing and OCT recommended.",
    emergencyLevel: "High",
    treatment: "Topical beta-blockers, prostaglandin analogs, alpha agonists. Surgical options include trabeculectomy, tube shunt, or minimally invasive glaucoma surgery (MIGS).",
  },
  Cataract: {
    description: "Opacification of the crystalline lens causing reduced visual acuity, glare sensitivity, and color perception changes. May be age-related, congenital, traumatic, or secondary to systemic disease.",
    symptoms: ["Clouded or blurred vision", "Increased sensitivity to glare", "Difficulty seeing at night", "Faded or yellowed colors", "Frequent changes in glasses prescription"],
    recommendedAction: "Schedule phacoemulsification surgery if visual impairment significantly affects daily activities. Monitor progression with slit-lamp examination.",
    emergencyLevel: "Medium",
    treatment: "Phacoemulsification with intraocular lens (IOL) implantation. Pre-operative biometry for IOL power calculation. Modern techniques allow rapid visual recovery.",
  },
  "Age-related Macular Degeneration": {
    description: "Degenerative changes in the macula, including drusen, geographic atrophy (dry AMD), or choroidal neovascularization (wet AMD). Leading cause of vision loss in adults over 60 in developed countries.",
    symptoms: ["Distorted or wavy vision", "Central vision loss or blurriness", "Difficulty reading or recognizing faces", "Dark or empty areas in central vision", "Need for brighter light"],
    recommendedAction: "Refer to retina specialist urgently. Consider anti-VEGF intravitreal injections for wet AMD. AREDS2 vitamin supplementation recommended for dry AMD.",
    emergencyLevel: "High",
    treatment: "Anti-VEGF injections (ranibizumab, aflibercept, bevacizumab) for wet AMD. Photodynamic therapy. AREDS2 supplements for dry AMD. Lifestyle modifications.",
  },
  "Retinal Detachment": {
    description: "Separation of the neurosensory retina from the underlying retinal pigment epithelium. A medical emergency — delayed treatment can result in permanent vision loss. Risk factors include myopia, trauma, and previous eye surgery.",
    symptoms: ["Sudden appearance of floaters", "Flashes of light (photopsia)", "Shadow or curtain over visual field", "Sudden decrease in vision", "Peripheral vision loss"],
    recommendedAction: "EMERGENCY: Immediate surgical consultation required. Pars plana vitrectomy or scleral buckling may be indicated. Time-sensitive — vision loss risk increases hourly.",
    emergencyLevel: "Critical",
    treatment: "Emergency surgery: pneumatic retinopexy, scleral buckle, or pars plana vitrectomy with gas or silicone oil tamponade. Prognosis depends on macular involvement and time to treatment.",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type InferenceResult = {
  success: boolean;
  prediction: string;
  confidence: number;
  confidence_percentage: number;
  class_probabilities: Record<string, number>;
  diagnosis: {
    disease: string;
    confidence: number;
    severity: string;
    description: string;
    recommendation: string;
    severity_color: string;
  };
  gradcam: string;  // data:image/png;base64,...
  original_image: string;  // data:image/png;base64,...
  model_info: {
    architecture: string;
    num_classes: number;
    classes: string[];
    device: string;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case "Low": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "Moderate":
    case "Medium": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "High": return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    case "Critical": return "text-red-400 bg-red-400/10 border-red-400/30";
    default: return "text-gray-400 bg-gray-400/10 border-gray-400/30";
  }
}

function getRiskIcon(riskLevel: string) {
  switch (riskLevel) {
    case "Low": return CheckCircle;
    case "Moderate":
    case "Medium": return AlertTriangle;
    case "High": return AlertTriangle;
    case "Critical": return AlertCircle;
    default: return Info;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ImageAnalysis() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [showGradCam, setShowGradCam] = useState(false);
  const [aiStatus, setAiStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve the ML backend fresh on every render so a fallback switch is
  // picked up immediately (previously computed at module scope, which captured
  // stale values and kept calling the unreachable primary endpoint).
  const { base: ML_BACKEND_URL, mode: mlMode, usingFallback } = effectiveMlBackend();
  const ML_MODE_LABEL = usingFallback
    ? "Sandbox (fallback)"
    : mlMode === "direct"
      ? "Render (direct)"
      : "local proxy";

  // Check ML backend health on mount (Render free tier wakes on first request)
  const checkHealth = useCallback(async () => {
    if (!ML_BACKEND_URL) {
      setAiStatus("unknown");
      return;
    }
    const status = await checkMlHealth();
    if (status === "online") markMlBackendReachable();
    setAiStatus(status);
  }, [ML_BACKEND_URL]);
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Simulate progress bar during analysis
  const simulateProgress = useCallback(() => {
    setAnalysisProgress(0);
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 300);
    return interval;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/tiff"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, BMP, or TIFF image");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        setUploadedFile(file);
        setResult(null);
        setShowGradCam(false);
        toast.info("Image uploaded. Click 'Analyze' to begin AI inference.");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/bmp", "image/tiff"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, BMP, or TIFF image");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        setUploadedFile(file);
        setResult(null);
        setShowGradCam(false);
        toast.info("Image uploaded. Click 'Analyze' to begin AI inference.");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!uploadedFile) return;
    setIsAnalyzing(true);
    setShowGradCam(false);
    setResult(null);

    const progressInterval = simulateProgress();

    try {
      // If ML backend is configured, call the real API
      if (ML_BACKEND_URL) {
        const formData = new FormData();
        formData.append("image", uploadedFile);

        toast.loading("Sending image to EfficientNet-B0 for analysis...", { id: "analyzing" });

        const predictUrl = mlMode === "proxy" ? "/api/ml/predict" : `${ML_BACKEND_URL}/predict`;

        // On the deployed production site the Resolve order defaults to the
        // sandbox fallback (Render is unreachable from browsers). If the call
        // fails, fall over to the other endpoint with a long tolerance window.
        let response: Response | null = null;
        let usedFallback = false;
        try {
          response = await mlFetch(predictUrl, {
            method: "POST",
            body: formData,
            timeoutMs: 150_000,
            maxAttempts: 1,
          });
          if (!response.ok) {
            // Non-2xx from primary: fail over.
            response = null;
            throw new Error(`Primary endpoint failed`);
          }
        } catch (primaryErr) {
          void primaryErr;
          markMlBackendUnreachable();
          const fallback = effectiveMlBackend();
          usedFallback = true;
          response = await mlFetch(`${fallback.base}/predict`, {
            method: "POST",
            body: formData,
            timeoutMs: 150_000,
            maxAttempts: 1,
          }).then((r) => {
            markMlBackendReachable();
            return r;
          });
        }

        clearInterval(progressInterval);
        setAnalysisProgress(100);

        if (!response) {
          throw new Error("No response received from any backend");
        }
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          const text = await response.text().catch(() => "");
          throw new Error(`Server returned ${response.status}: ${text.slice(0, 120)}`);
        }

        const data: InferenceResult = await response.json();

        if (data.success) {
          setResult(data);
          setShowGradCam(true);
          toast.dismiss("analyzing");
          toast.success(
            `${usedFallback ? "Fallback backend: " : ""}Prediction complete: ${data.prediction} (${data.confidence_percentage}%)`,
          );
          setAiStatus("online");
        } else {
          throw new Error("Inference returned no result");
        }
      } else {
        // Real ML backend is required — no mock predictions allowed
        clearInterval(progressInterval);
        setAnalysisProgress(0);
        throw new Error(
          "ML backend not connected. Set VITE_ML_BACKEND_URL in Settings > Secrets. " +
          "Deploy the Flask backend from ml-backend/ first."
        );
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setAnalysisProgress(0);
      toast.dismiss("analyzing");
      toast.error(`Analysis failed: ${error.message || "Unknown error"}`);
      setAiStatus("offline");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const topPrediction = result?.prediction || result?.class_probabilities ? null : null;

  // Extract top prediction from the result
  const getTopPrediction = () => {
    if (!result) return null;
    if (result.prediction) {
      const confidence = result.confidence_percentage || result.confidence * 100;
      return { label: result.prediction, confidence };
    }
    return null;
  };

  const getPredictions = (): { label: string; confidence: number }[] => {
    if (!result?.class_probabilities) return [];
    return Object.entries(result.class_probabilities)
      .sort(([, a], [, b]) => b - a)
      .map(([label, conf]) => ({ label, confidence: conf * 100 }));
  };

  const topPred = getTopPrediction();
  const allPredictions = getPredictions();
  const diseaseData = topPred ? diseaseInfo[topPred.label] : null;
  const riskColor = diseaseData ? getRiskColor(diseaseData.emergencyLevel) : "";
  const RiskIcon = diseaseData ? getRiskIcon(diseaseData.emergencyLevel) : Info;

  return (
    <div className="space-y-6">
      {/* ML Backend Warning Banner */}
      {!ML_BACKEND_URL && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">ML Backend Not Connected</p>
            <p className="text-xs text-amber-300/70 mt-1">
              Real AI inference requires the Flask backend to be deployed and connected.
              Set <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono text-[10px]">VITE_ML_BACKEND_URL</code> in Settings &gt; Secrets.
              See <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono text-[10px]">ml-backend/DEPLOYMENT.md</code> for instructions.
            </p>
          </div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Image Analysis</h1>
          <p className="text-sm text-gray-400 mt-1">Upload a retinal image for AI-powered diagnosis</p>
        </div>
        {/* AI Status Badge */}
        <div className="glass-card px-4 py-2 flex items-center gap-3">
          <Server className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              aiStatus === "online" ? "bg-emerald-400 animate-pulse" :
              aiStatus === "offline" ? "bg-red-400" : "bg-gray-400"
            }`} />
            <span className="font-mono text-xs">
              {ML_BACKEND_URL ? (
                aiStatus === "online" ? "ML Backend Online" :
                aiStatus === "offline" ? "ML Backend Offline" : "Checking (Render may be waking up)..."
              ) : "Backend Required"}
            </span>
            <span className="font-mono text-[10px] text-gray-500 hidden sm:inline">{ML_MODE_LABEL}</span>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <div
          className="glass-card p-6 relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#3B82F6]" />
            Upload Retina Image
          </h3>

          {!uploadedImage ? (
            <div
              className="border-2 border-dashed border-blue-500/20 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500/40 transition-all duration-300 group"
              onClick={() => fileInputRef.current?.click()}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20"
              >
                <ImageIcon className="w-8 h-8 text-[#3B82F6]" />
              </motion.div>
              <p className="text-sm text-gray-400 mb-1">Drag and drop retina image</p>
              <p className="text-xs text-gray-500 mb-4">JPG, PNG, BMP, TIFF — Max 10MB</p>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="rounded-xl overflow-hidden border border-blue-500/20">
                <img
                  src={uploadedImage}
                  alt="Uploaded retina"
                  className="w-full h-64 object-cover"
                />
              </div>
              <button
                onClick={() => { setUploadedImage(null); setUploadedFile(null); setResult(null); setShowGradCam(false); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.bmp,.tiff"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadedImage && !result && (
            <Button
              className="w-full mt-4 bg-[#3B82F6] hover:bg-[#2563EB] h-11 rounded-xl font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : !ML_BACKEND_URL ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Connect ML Backend
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Image
                </>
              )}
            </Button>
          )}

          {/* Analysis Progress Bar */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">Processing</span>
                  <span className="text-xs font-mono text-[#3B82F6]">{Math.round(analysisProgress)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
                    animate={{ width: `${analysisProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-[#3B82F6]"
                  />
                  <span className="text-[11px] font-mono text-gray-500">
                    {analysisProgress < 30 ? "Preprocessing image..." :
                     analysisProgress < 60 ? "Running EfficientNet-B0 inference..." :
                     analysisProgress < 90 ? "Generating Grad-CAM heatmap..." :
                     "Finalizing results..."}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Prediction Card */}
        <div className="glass-card p-6">
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#3B82F6]" />
            AI Prediction
          </h3>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-2 border-blue-500/30 border-t-[#3B82F6] rounded-full"
              />
              <p className="text-sm text-gray-400 mt-4 font-mono">Processing retinal patterns...</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">EfficientNet-B0 inference running</p>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {/* Disease Name */}
              {topPred && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-display text-xl font-bold text-white">
                      {topPred.label}
                    </h4>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border ${riskColor}`}>
                      <RiskIcon className="w-3 h-3" />
                      {diseaseData?.emergencyLevel} Risk
                    </span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-[#3B82F6]">
                    {topPred.confidence.toFixed(2)}%
                    <span className="text-sm text-gray-400 ml-2 font-body font-normal">confidence</span>
                  </div>
                </div>
              )}

              {/* Probability Bars */}
              {allPredictions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Probability Distribution</h5>
                  {allPredictions.map((pred, i) => (
                    <motion.div
                      key={pred.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${i === 0 ? "text-white font-medium" : "text-gray-400"}`}>
                          {pred.label}
                        </span>
                        <span className={`font-mono text-xs ${i === 0 ? "text-[#3B82F6] font-semibold" : "text-gray-500"}`}>
                          {pred.confidence.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pred.confidence}%` }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                          style={{
                            background: i === 0
                              ? "linear-gradient(90deg, #3B82F6, #60A5FA)"
                              : "rgba(59,130,246,0.2)",
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Brain className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No analysis yet</p>
              <p className="text-xs mt-1">Upload and analyze an image to see predictions</p>
            </div>
          )}
        </div>
      </div>

      {/* Grad-CAM Section */}
      <AnimatePresence>
        {showGradCam && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Explainable AI — Grad-CAM Visualization
            </h3>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Original */}
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Original Image</div>
                <div className="rounded-xl overflow-hidden border border-blue-500/20">
          <img
            src={result.original_image || uploadedImage || undefined}
            alt="Original retina"
            className="w-full h-48 object-cover"
          />
                </div>
              </div>

              {/* Heatmap */}
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Grad-CAM Heatmap</div>
                <div className="rounded-xl overflow-hidden border border-blue-500/20">
                  <img
                    src={result.gradcam}
                    alt="Grad-CAM heatmap"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>

              {/* Overlay */}
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Overlay</div>
                <div className="rounded-xl overflow-hidden border border-blue-500/20 relative h-48">
                  <img
                    src={result.original_image || uploadedImage || undefined}
                    alt="Overlay"
                    className="w-full h-full object-cover"
                  />
                  <img
                    src={result.gradcam}
                    alt="Heatmap overlay"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-60"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medical Report Card */}
      <AnimatePresence>
        {result && topPred && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3B82F6]" />
                Medical Report
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                  onClick={() => toast.info("PDF report downloading...")}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Report
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Prediction", value: topPred.label },
                { label: "Confidence", value: `${topPred.confidence.toFixed(2)}%` },
                { label: "Model Used", value: result.model_info?.architecture || "EfficientNet-B0" },
                { label: "Date", value: new Date().toLocaleDateString("en-US") },
              ].map((item) => (
                <div key={item.label} className="bg-white/3 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className={`text-sm font-semibold ${item.label === "Confidence" ? "text-[#3B82F6]" : "text-white"}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Disease Information */}
            {diseaseData && (
              <div className="border-t border-white/5 pt-6">
                <h4 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Disease Information — {topPred.label}
                </h4>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Description</div>
                      <p className="text-sm text-gray-300 leading-relaxed">{diseaseData.description}</p>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Symptoms</div>
                      <ul className="space-y-1">
                        {diseaseData.symptoms.map((s, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Thermometer className="w-3 h-3" />
                        Emergency Level
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono border ${riskColor}`}>
                        <RiskIcon className="w-4 h-4" />
                        {diseaseData.emergencyLevel}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Recommended Action</div>
                      <p className="text-sm text-gray-300 leading-relaxed">{diseaseData.recommendedAction}</p>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Treatment</div>
                      <p className="text-sm text-gray-300 leading-relaxed">{diseaseData.treatment}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check health on mount */}
      <div style={{ display: "none" }}>
        <HealthChecker onMount={checkHealth} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health checker component (runs once on mount)
// ---------------------------------------------------------------------------
function HealthChecker({ onMount }: { onMount: () => void }) {
  useState(() => { onMount(); return null; });
  return null;
}
