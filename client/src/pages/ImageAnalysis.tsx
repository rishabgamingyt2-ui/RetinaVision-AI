/*
 * ImageAnalysis — Core analysis page with upload, prediction, Grad-CAM, report
 * Style: Clinical Nebula — glassmorphism cards, animated probability bars
 */
import { useState, useRef, useCallback } from "react";
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
} from "lucide-react";

// Simulated disease data
const diseaseClasses = [
  "Normal",
  "Retinoblastoma",
  "Uveal Melanoma",
  "Retinal Capillary Hemangioma",
  "Choroidal Osteoma",
  "Choroidal Hemangioma",
];

const diseaseInfo: Record<string, {
  description: string;
  symptoms: string[];
  recommendedAction: string;
  emergencyLevel: string;
  treatment: string;
}> = {
  Normal: {
    description: "The retina appears healthy with no signs of disease or abnormality. All retinal structures including the optic disc, macula, and blood vessels appear normal.",
    symptoms: ["No visual impairment", "No retinal abnormalities detected", "Clear fundus examination"],
    recommendedAction: "Routine eye examination every 1-2 years is recommended for maintaining eye health.",
    emergencyLevel: "Low",
    treatment: "No treatment required. Continue regular eye health monitoring.",
  },
  Retinoblastoma: {
    description: "A rare form of eye cancer that develops from the immature cells of a retina. It is the most common primary intraocular malignancy in children.",
    symptoms: ["White reflection in pupil (leukocoria)", "Crossed eyes (strabismus)", "Redness of the eye", "Poor vision"],
    recommendedAction: "Immediate referral to pediatric ophthalmology and oncology for comprehensive evaluation and staging.",
    emergencyLevel: "Critical",
    treatment: "Treatment options include focal therapy, chemotherapy, radiation therapy, or enucleation depending on stage and tumor size.",
  },
  "Uveal Melanoma": {
    description: "The most common primary intraocular malignancy in adults, arising from melanocytes in the uveal tract including the choroid.",
    symptoms: ["Blurred vision", "Flash of light sensation", "Change in iris color", "Growing dark spot on iris"],
    recommendedAction: "Urgent referral to ocular oncology for further imaging (ultrasound, MRI) and treatment planning.",
    emergencyLevel: "High",
    treatment: "Treatment may include plaque brachytherapy, proton beam radiation, or enucleation for large tumors.",
  },
  "Retinal Capillary Hemangioma": {
    description: "A benign vascular tumor of the retina that may occur as a solitary lesion or as part of von Hippel-Lindau disease.",
    symptoms: ["Gradual vision loss", "Floaters", "Retinal detachment", "Glaucoma in advanced cases"],
    recommendedAction: "Refer to retina specialist for monitoring and possible treatment to prevent complications.",
    emergencyLevel: "Moderate",
    treatment: "Observation for small lesions; laser photocoagulation, cryotherapy, or anti-VEGF therapy for progressive lesions.",
  },
  "Choroidal Osteoma": {
    description: "A rare, benign, ossifying tumor of the choroid that typically occurs in young women. It consists of mature bone tissue within the choroid.",
    symptoms: ["Gradual vision loss", "Metamorphopsia", "Scotoma (blind spot)", "Often asymptomatic initially"],
    recommendedAction: "Regular monitoring by retina specialist. Referral to ocular oncology for confirmation.",
    emergencyLevel: "Moderate",
    treatment: "Observation for asymptomatic cases. Anti-VEGF therapy for choroidal neovascularization. Photodynamic therapy.",
  },
  "Choroidal Hemangioma": {
    description: "A benign, vascular tumor of the choroid that is typically present at birth. May be associated with Sturge-Weber syndrome.",
    symptoms: ["Decreased visual acuity", "Metamorphopsia", "Hyperopia", "Exudative retinal detachment"],
    recommendedAction: "Referral to retina specialist for evaluation and treatment planning to preserve vision.",
    emergencyLevel: "Moderate",
    treatment: "Observation if asymptomatic. Photodynamic therapy, laser photocoagulation, or radiation for symptomatic cases.",
  },
};

// Simulated analysis result
function getSimulatedResult() {
  const rand = Math.random();
  if (rand > 0.3) {
    return {
      predictions: [
        { label: "Normal", confidence: 99.91 },
        { label: "Retinoblastoma", confidence: 0.04 },
        { label: "Uveal Melanoma", confidence: 0.03 },
        { label: "Retinal Capillary Hemangioma", confidence: 0.01 },
        { label: "Choroidal Osteoma", confidence: 0.01 },
        { label: "Choroidal Hemangioma", confidence: 0.00 },
      ],
    };
  } else if (rand > 0.15) {
    return {
      predictions: [
        { label: "Retinoblastoma", confidence: 94.7 },
        { label: "Choroidal Hemangioma", confidence: 2.8 },
        { label: "Uveal Melanoma", confidence: 1.5 },
        { label: "Normal", confidence: 0.6 },
        { label: "Retinal Capillary Hemangioma", confidence: 0.3 },
        { label: "Choroidal Osteoma", confidence: 0.1 },
      ],
    };
  } else {
    return {
      predictions: [
        { label: "Uveal Melanoma", confidence: 87.3 },
        { label: "Choroidal Osteoma", confidence: 5.2 },
        { label: "Normal", confidence: 3.8 },
        { label: "Retinal Capillary Hemangioma", confidence: 2.1 },
        { label: "Choroidal Hemangioma", confidence: 1.1 },
        { label: "Retinoblastoma", confidence: 0.5 },
      ],
    };
  }
}

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case "Low": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "Moderate": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "High": return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    case "Critical": return "text-red-400 bg-red-400/10 border-red-400/30";
    default: return "text-gray-400 bg-gray-400/10 border-gray-400/30";
  }
}

function getRiskIcon(riskLevel: string) {
  switch (riskLevel) {
    case "Low": return CheckCircle;
    case "Moderate": return AlertTriangle;
    case "High": return AlertTriangle;
    case "Critical": return AlertCircle;
    default: return Info;
  }
}

export default function ImageAnalysis() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    predictions: { label: string; confidence: number }[];
  } | null>(null);
  const [showGradCam, setShowGradCam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, or JPEG file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        setResult(null);
        setShowGradCam(false);
        toast.info("Image uploaded. Click 'Analyze' to begin.");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, or JPEG file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
        setResult(null);
        setShowGradCam(false);
        toast.info("Image uploaded. Click 'Analyze' to begin.");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true);
    toast.loading("Processing retinal patterns...", { id: "analyzing" });

    setTimeout(() => {
      const simResult = getSimulatedResult();
      setResult(simResult);
      setIsAnalyzing(false);
      setShowGradCam(true);
      toast.dismiss("analyzing");
      toast.success("Neural pathways analyzed successfully.");
    }, 2500);
  };

  const topPrediction = result?.predictions[0];
  const diseaseData = topPrediction ? diseaseInfo[topPrediction.label] : null;
  const riskColor = diseaseData ? getRiskColor(diseaseData.emergencyLevel) : "";
  const RiskIcon = diseaseData ? getRiskIcon(diseaseData.emergencyLevel) : Info;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Image Analysis</h1>
          <p className="text-sm text-gray-400 mt-1">Upload a retinal image for AI-powered diagnosis</p>
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
              <p className="text-xs text-gray-500 mb-4">JPG, PNG, JPEG — Max 10MB</p>
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
                onClick={() => { setUploadedImage(null); setResult(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
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
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Image
                </>
              )}
            </Button>
          )}
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
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-display text-xl font-bold text-white">
                    {topPrediction?.label}
                  </h4>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border ${riskColor}`}>
                    <RiskIcon className="w-3 h-3" />
                    {diseaseData?.emergencyLevel} Risk
                  </span>
                </div>
                <div className="font-mono text-3xl font-bold text-[#3B82F6]">
                  {topPrediction?.confidence.toFixed(2)}%
                  <span className="text-sm text-gray-400 ml-2 font-body font-normal">confidence</span>
                </div>
              </div>

              {/* Probability Bars */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Probability Distribution</h5>
                {result.predictions.map((pred, i) => (
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
                    src={uploadedImage || undefined}
                    alt="Original retina"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>

              {/* Heatmap */}
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Grad-CAM Heatmap</div>
                <div className="rounded-xl overflow-hidden border border-blue-500/20 relative h-48 bg-[#0B1220]">
                  {/* Simulated heatmap overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-32 h-32 rounded-full"
                      style={{
                        background: "radial-gradient(circle, rgba(239,68,68,0.6) 0%, rgba(245,158,11,0.4) 30%, rgba(59,130,246,0.2) 60%, transparent 100%)",
                      }}
                    />
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60">
                    <span className="text-[8px] font-mono text-red-400">Hot</span>
                    <div className="w-12 h-2 rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500" />
                    <span className="text-[8px] font-mono text-blue-400">Cold</span>
                  </div>
                </div>
              </div>

              {/* Overlay */}
              <div>
                <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Overlay</div>
                <div className="rounded-xl overflow-hidden border border-blue-500/20 relative h-48">
                  <img
                    src={uploadedImage || undefined}
                    alt="Overlay"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.35) 0%, rgba(245,158,11,0.2) 25%, rgba(59,130,246,0.1) 50%, transparent 75%)",
                      mixBlendMode: "screen",
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medical Report Card */}
      <AnimatePresence>
        {result && (
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
                { label: "Prediction", value: topPrediction?.label || "—" },
                { label: "Confidence", value: `${topPrediction?.confidence.toFixed(2)}%` },
                { label: "Model Used", value: "EfficientNet-B0" },
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
                  Disease Information — {topPrediction?.label}
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
    </div>
  );
}
