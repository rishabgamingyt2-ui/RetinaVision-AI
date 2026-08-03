/*
 * AboutPage — About RetinaVision AI, tech stack, methodology
 * Style: Clinical Nebula — glassmorphism cards, informative layout
 */
import { motion } from "framer-motion";
import {
  Brain,
  Cpu,
  Code2,
  Shield,
  BookOpen,
  Github,
  Layers,
  Eye,
} from "lucide-react";

const techStack = [
  { name: "PyTorch", desc: "Deep learning framework for model training and inference", icon: Cpu },
  { name: "EfficientNet-B0", desc: "State-of-the-art CNN architecture for image classification", icon: Brain },
  { name: "Grad-CAM", desc: "Gradient-weighted class activation mapping for explainability", icon: Eye },
  { name: "Python", desc: "Primary programming language for data processing and ML", icon: Code2 },
  { name: "React + TypeScript", desc: "Frontend framework for the web application interface", icon: Layers },
  { name: "Tailwind CSS", desc: "Utility-first CSS framework for responsive design", icon: Code2 },
];

const methodology = [
  {
    step: "01",
    title: "Data Collection",
    desc: "Curated dataset of retinal fundus images across 6 disease classes with expert annotations.",
  },
  {
    step: "02",
    title: "Preprocessing",
    desc: "Image normalization, augmentation, and quality filtering for optimal model input.",
  },
  {
    step: "03",
    title: "Model Training",
    desc: "EfficientNet-B0 trained with transfer learning, achieving 96.52% accuracy on validation set.",
  },
  {
    step: "04",
    title: "Explainability",
    desc: "Grad-CAM integration to visualize model attention and build clinical trust.",
  },
  {
    step: "05",
    title: "Deployment",
    desc: "Production-ready web application with real-time inference and report generation.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold">About RetinaVision AI</h1>
        <p className="text-sm text-gray-400 mt-1">Technology, methodology, and research background</p>
      </div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#3B82F6]" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Our Mission</h2>
            <p className="text-sm text-gray-400">Bridging AI and clinical ophthalmology</p>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed">
          RetinaVision AI is an AI-powered retinal disease detection system designed to assist
          ophthalmologists and hospitals in rapidly identifying retinal abnormalities. Using
          state-of-the-art deep learning architectures, our system provides instant analysis
          with explainable results, helping clinicians make informed decisions with confidence.
        </p>
      </motion.div>

      {/* Methodology */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#3B82F6]" />
          Development Methodology
        </h2>
        <div className="space-y-3">
          {methodology.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-4 flex items-start gap-4"
            >
              <div className="font-mono text-lg font-bold text-[#3B82F6] shrink-0">{item.step}</div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Technology Stack
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {techStack.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <tech.icon className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{tech.name}</div>
                <div className="text-xs text-gray-500">{tech.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Model Performance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8"
      >
        <h2 className="font-display text-lg font-semibold mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Model Performance Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Architecture", value: "EfficientNet-B0" },
            { label: "Accuracy", value: "96.52%" },
            { label: "Dataset Size", value: "2,163 Images" },
            { label: "Classes", value: "6 Diseases" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">{item.label}</div>
              <div className="text-lg font-bold font-mono text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="border-t border-white/5 pt-6 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/manus-storage/logo-icon_ebcc78e5.png" alt="Logo" className="w-6 h-6" />
            <span className="font-display text-sm font-semibold">RetinaVision AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500 font-mono">
            <span>PyTorch</span>
            <span>•</span>
            <span>EfficientNet-B0</span>
            <span>•</span>
            <span>Grad-CAM</span>
            <span>•</span>
            <span>React</span>
            <span>•</span>
            <span>Tailwind CSS</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
