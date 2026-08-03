/*
 * MetricsPage — Model performance metrics, confusion matrix, training curves
 * Style: Clinical Nebula — dark theme, recharts, glassmorphism
 */
import { motion } from "framer-motion";
import {
  BarChart3,
  Target,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
} from "recharts";

// Simulated training data
const trainingData = Array.from({ length: 30 }, (_, i) => ({
  epoch: i + 1,
  accuracy: Math.min(0.96 + Math.random() * 0.02, 0.99),
  valAccuracy: Math.min(0.93 + Math.random() * 0.03, 0.97),
  loss: Math.max(0.01, 0.8 - i * 0.025 + Math.random() * 0.02),
  valLoss: Math.max(0.02, 0.85 - i * 0.023 + Math.random() * 0.03),
}));

const perClassData = [
  { name: "Normal", precision: 0.98, recall: 0.99, f1: 0.985 },
  { name: "Retinoblastoma", precision: 0.95, recall: 0.94, f1: 0.945 },
  { name: "Uveal Melanoma", precision: 0.94, recall: 0.93, f1: 0.935 },
  { name: "RCH", precision: 0.96, recall: 0.95, f1: 0.955 },
  { name: "Choroidal Osteoma", precision: 0.93, recall: 0.92, f1: 0.925 },
  { name: "Choroidal Hemangioma", precision: 0.97, recall: 0.96, f1: 0.965 },
];

const confusionMatrix = [
  [1245, 3, 1, 2, 0, 1],
  [2, 198, 5, 3, 1, 0],
  [1, 4, 186, 2, 3, 1],
  [2, 2, 1, 165, 1, 2],
  [0, 1, 3, 2, 142, 1],
  [1, 0, 2, 1, 2, 178],
];
const classLabels = ["Normal", "Rb", "UM", "RCH", "CO", "CH"];

const COLORS = ["#3B82F6", "#60A5FA", "#1E3A8A", "#10B981", "#F59E0B", "#EF4444"];

export default function MetricsPage() {
  const totalPredictions = confusionMatrix.flat().reduce((a, b) => a + b, 0);
  const correctPredictions = confusionMatrix.reduce((acc, row, i) => acc + row[i], 0);
  const accuracy = ((correctPredictions / totalPredictions) * 100).toFixed(2);

  const metricCards = [
    { label: "Model Accuracy", value: `${accuracy}%`, icon: Award, color: "text-[#3B82F6]" },
    { label: "Precision", value: "96.2%", icon: Target, color: "text-emerald-400" },
    { label: "Recall", value: "95.8%", icon: TrendingUp, color: "text-blue-300" },
    { label: "F1 Score", value: "96.0%", icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Performance Metrics</h1>
        <p className="text-sm text-gray-400 mt-1">Model evaluation results and training progress</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${card.color}`}>{card.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Training Curves */}
        <div className="glass-card p-6">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
            Training & Validation Accuracy
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="epoch" tick={{ fill: "#6B7280", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                <YAxis domain={[0.85, 1]} tick={{ fill: "#6B7280", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={2} dot={false} name="Training" />
                <Line type="monotone" dataKey="valAccuracy" stroke="#60A5FA" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Validation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loss Curves */}
        <div className="glass-card p-6">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            Training & Validation Loss
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="epoch" tick={{ fill: "#6B7280", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={2} dot={false} name="Training Loss" />
                <Line type="monotone" dataKey="valLoss" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Validation Loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Radar Chart + Confusion Matrix */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Per-class Metrics */}
        <div className="glass-card p-6">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Per-Class Performance
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={perClassData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0.85, 1]} tick={{ fill: "#6B7280", fontSize: 10 }} />
                <Radar name="Precision" dataKey="precision" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
                <Radar name="Recall" dataKey="recall" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                <Radar name="F1" dataKey="f1" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.05} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", fontSize: "12px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="glass-card p-6">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Confusion Matrix
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Header */}
              <div className="flex mb-1">
                <div className="w-16" />
                <div className="flex-1 grid grid-cols-6 gap-0.5">
                  {classLabels.map((label) => (
                    <div key={label} className="text-center text-[9px] font-mono text-gray-500 truncate px-0.5">{label}</div>
                  ))}
                </div>
              </div>
              {/* Rows */}
              {confusionMatrix.map((row, i) => (
                <div key={i} className="flex mb-0.5">
                  <div className="w-16 text-[9px] font-mono text-gray-500 flex items-center truncate px-0.5">{classLabels[i]}</div>
                  <div className="flex-1 grid grid-cols-6 gap-0.5">
                    {row.map((val, j) => {
                      const isDiagonal = i === j;
                      const maxVal = Math.max(...confusionMatrix.flat());
                      const intensity = val / maxVal;
                      return (
                        <div
                          key={j}
                          className="h-8 flex items-center justify-center rounded text-[10px] font-mono transition-all"
                          style={{
                            background: isDiagonal
                              ? `rgba(59,130,246,${0.3 + intensity * 0.5})`
                              : `rgba(255,255,255,${intensity * 0.08})`,
                            color: isDiagonal ? "#93C5FD" : "#6B7280",
                          }}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500/50" />
                  <span className="text-[10px] text-gray-500">Correct</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-white/5" />
                  <span className="text-[10px] text-gray-500">Misclassified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-class Bar Chart */}
      <div className="glass-card p-6">
        <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
          Class Distribution (Sample Count)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: "Normal", count: 1252 },
              { name: "Retinoblastoma", count: 209 },
              { name: "Uveal Melanoma", count: 196 },
              { name: "RCH", count: 173 },
              { name: "Choroidal Osteoma", count: 149 },
              { name: "Choroidal Hemangioma", count: 184 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {perClassData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
