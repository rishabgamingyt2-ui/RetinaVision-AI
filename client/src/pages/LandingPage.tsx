/*
 * Design: Clinical Nebula — Cinematic Dark UI
 * Hero: Full-viewport with animated retina illustration, gradient auras, glassmorphism
 * Typography: DM Sans headings, Inter body, JetBrains Mono for data
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Eye,
  Brain,
  Shield,
  Zap,
  ChevronRight,
  ArrowRight,
  Activity,
  Target,
  Sparkles,
} from "lucide-react";

// Retina ring SVG component
function RetinaRing({ size = 200, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="95" stroke="url(#grad1)" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="80" stroke="url(#grad2)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="100" cy="100" r="60" stroke="url(#grad3)" strokeWidth="2" opacity="0.5" />
      <circle cx="100" cy="100" r="40" stroke="url(#grad4)" strokeWidth="2.5" opacity="0.6" />
      <circle cx="100" cy="100" r="20" stroke="url(#grad5)" strokeWidth="3" opacity="0.8" />
      <circle cx="100" cy="100" r="8" fill="url(#grad6)" opacity="0.9" />
      {/* Neural pathway lines */}
      <line x1="100" y1="5" x2="100" y2="42" stroke="#3B82F6" strokeWidth="0.5" opacity="0.3" />
      <line x1="195" y1="100" x2="158" y2="100" stroke="#60A5FA" strokeWidth="0.5" opacity="0.3" />
      <line x1="100" y1="195" x2="100" y2="158" stroke="#3B82F6" strokeWidth="0.5" opacity="0.3" />
      <line x1="5" y1="100" x2="42" y2="100" stroke="#60A5FA" strokeWidth="0.5" opacity="0.3" />
      <defs>
        <linearGradient id="grad1" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="grad2" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="grad3" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="grad4" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="grad5" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="grad6">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Animated floating particle
function FloatingParticle({ delay = 0, size = 4 }: { delay?: number; size?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-blue-400/30"
      style={{ width: size, height: size }}
      animate={{
        y: [0, -20, 0],
        opacity: [0.3, 0.8, 0.3],
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "Deep Learning AI",
      desc: "Powered by EfficientNet-B0 with 96.52% accuracy across 6 retinal disease classes",
    },
    {
      icon: Shield,
      title: "Explainable Results",
      desc: "Grad-CAM heatmaps show exactly where the AI is looking, building clinical trust",
    },
    {
      icon: Zap,
      title: "Instant Analysis",
      desc: "Get comprehensive diagnosis in seconds with confidence scores and risk assessment",
    },
    {
      icon: Activity,
      title: "Medical Reports",
      desc: "Professional PDF reports with diagnosis, recommendations, and treatment guidance",
    },
    {
      icon: Target,
      title: "Multi-Disease Detection",
      desc: "Detects Retinoblastoma, Uveal Melanoma, Hemangioma, Osteoma, and more",
    },
    {
      icon: Sparkles,
      title: "Clinical Grade",
      desc: "Built for hospitals and ophthalmologists with enterprise-grade reliability",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B1220] text-white overflow-x-hidden">
      {/* Fixed Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(30,58,138,0.15)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />
        {/* Floating particles */}
        <FloatingParticle delay={0} size={3} />
        <FloatingParticle delay={1.5} size={4} />
        <FloatingParticle delay={3} size={2} />
        <FloatingParticle delay={0.5} size={5} />
        <FloatingParticle delay={2} size={3} />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-blue-500/5"
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/manus-storage/logo-icon_ebcc78e5.png"
              alt="RetinaVision AI"
              className="w-8 h-8"
            />
            <span className="font-display text-lg font-bold tracking-tight">
              Retina<span className="text-[#3B82F6]">Vision</span> AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Features</a>
            <a href="#technology" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Technology</a>
            <Link href="/dashboard/analysis">
              <span className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Dashboard</span>
            </Link>
          </div>
          <Link href="/dashboard/analysis">
            <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              Launch App
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-blue-300">AI Model Active — v2.1</span>
            </div>

            <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
              AI-Powered
              <br />
              <span className="text-gradient">Retinal Disease</span>
              <br />
              Detection
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-lg leading-relaxed">
              Detect retinal diseases instantly using Deep Learning with explainable AI.
              Built for hospitals, trusted by ophthalmologists.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard/analysis">
                <Button
                  size="lg"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold px-8 h-12 rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[0.98] active:scale-[0.95]"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Upload Retina Image
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-12 rounded-xl transition-all duration-200"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <div className="font-mono text-2xl font-semibold text-white">96.52%</div>
                <div className="text-xs text-gray-500 mt-1">Model Accuracy</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-white">6</div>
                <div className="text-xs text-gray-500 mt-1">Disease Classes</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-white">&lt;2s</div>
                <div className="text-xs text-gray-500 mt-1">Analysis Time</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Retina Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative flex items-center justify-center"
          >
            <div className="relative">
              {/* Glow behind retina */}
              <div
                className="absolute inset-0 blur-[80px] opacity-30"
                style={{
                  background: "radial-gradient(circle, #3B82F6 0%, #1E3A8A 50%, transparent 70%)",
                  transform: `translateY(${-scrollY * 0.05}px)`,
                }}
              />
              {/* Rotating rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <RetinaRing size={400} />
              </motion.div>
              {/* Counter-rotating rings */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <RetinaRing size={350} />
              </motion.div>
              {/* Center retina image */}
              <div className="relative w-72 h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden border-2 border-blue-500/20 glow-blue">
                <img
                  src="/manus-storage/hero-retina_c86e6e8b.png"
                  alt="Retina scan"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/50 to-transparent" />
              </div>
              {/* Scanning line */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl lg:text-5xl font-bold mb-4">
              Clinical-Grade <span className="text-gradient">AI Analysis</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every feature designed for precision medicine and clinical workflow integration
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="glass-card p-6 group hover:border-blue-500/30 transition-all duration-300 hover:glow-blue"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="relative py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,58,138,0.08)_0%,_transparent_70%)]" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-4xl font-bold mb-6">
                Powered by <span className="text-gradient">Grad-CAM</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Our explainable AI doesn't just predict — it shows you why. Grad-CAM heatmaps
                visualize exactly which regions of the retina the model considers most important,
                building trust between AI and clinician.
              </p>
              <div className="space-y-4">
                {[
                  { label: "EfficientNet-B0", desc: "Base architecture for feature extraction" },
                  { label: "Grad-CAM Visualization", desc: "Class activation mapping for interpretability" },
                  { label: "PyTorch Framework", desc: "Industry-standard deep learning library" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-2 shrink-0" />
                    <div>
                      <span className="font-mono text-sm font-medium text-blue-300">{item.label}</span>
                      <span className="text-gray-400 text-sm ml-2">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="glass-card p-2 glow-blue">
                <img
                  src="/manus-storage/analysis-visual_b5be9b9f.png"
                  alt="Grad-CAM analysis visualization"
                  className="w-full rounded-lg"
                />
              </div>
              {/* Floating annotation */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-4 -right-4 glass-card px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-emerald-400">Confidence: 99.91%</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-12 lg:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
                Ready to See What AI Sees?
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Upload a retinal image and receive an instant AI-powered diagnosis with explainable results.
              </p>
              <Link href="/dashboard/analysis">
                <Button
                  size="lg"
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold px-10 h-14 rounded-xl text-lg transition-all duration-200 hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
                >
                  Start Analysis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-500/10 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
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
              <span>Python</span>
            </div>
            <div className="text-xs text-gray-600">
              © 2024 RetinaVision AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
