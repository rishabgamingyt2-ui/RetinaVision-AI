/*
 * HistoryPage — Table of all uploaded images with thumbnails, disease, confidence, date
 * Style: Clinical Nebula — glassmorphism table, dark theme
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Clock,
  Download,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

// Simulated history data
const historyData = [
  { id: 1, disease: "Normal", confidence: 99.91, date: "2024-08-01", time: "14:32", thumbnail: "/manus-storage/hero-retina_c86e6e8b.png" },
  { id: 2, disease: "Normal", confidence: 98.45, date: "2024-07-28", time: "09:15", thumbnail: "/manus-storage/hero-retina_c86e6e8b.png" },
  { id: 3, disease: "Retinoblastoma", confidence: 94.7, date: "2024-07-25", time: "16:48", thumbnail: "/manus-storage/analysis-visual_b5be9b9f.png" },
  { id: 4, disease: "Uveal Melanoma", confidence: 87.3, date: "2024-07-22", time: "11:20", thumbnail: "/manus-storage/analysis-visual_b5be9b9f.png" },
  { id: 5, disease: "Normal", confidence: 99.12, date: "2024-07-18", time: "08:55", thumbnail: "/manus-storage/hero-retina_c86e6e8b.png" },
  { id: 6, disease: "Choroidal Osteoma", confidence: 82.6, date: "2024-07-15", time: "13:10", thumbnail: "/manus-storage/analysis-visual_b5be9b9f.png" },
  { id: 7, disease: "Normal", confidence: 97.88, date: "2024-07-10", time: "10:30", thumbnail: "/manus-storage/hero-retina_c86e6e8b.png" },
  { id: 8, disease: "Retinal Capillary Hemangioma", confidence: 78.2, date: "2024-07-05", time: "15:45", thumbnail: "/manus-storage/analysis-visual_b5be9b9f.png" },
];

function getRiskBadge(disease: string) {
  if (disease === "Normal") {
    return { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle };
  }
  if (["Retinoblastoma"].includes(disease)) {
    return { color: "text-red-400 bg-red-400/10 border-red-400/30", icon: AlertCircle };
  }
  if (["Uveal Melanoma"].includes(disease)) {
    return { color: "text-orange-400 bg-orange-400/10 border-orange-400/30", icon: AlertTriangle };
  }
  return { color: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: AlertTriangle };
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = historyData.filter(
    (h) =>
      h.disease.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.date.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">History</h1>
          <p className="text-sm text-gray-400 mt-1">All previously analyzed retinal images</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search by disease or date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-sm h-9 rounded-lg"
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-mono text-gray-500 uppercase tracking-wider px-6 py-3">Thumbnail</th>
                <th className="text-left text-xs font-mono text-gray-500 uppercase tracking-wider px-6 py-3">Disease</th>
                <th className="text-left text-xs font-mono text-gray-500 uppercase tracking-wider px-6 py-3">Confidence</th>
                <th className="text-left text-xs font-mono text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-mono text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const badge = getRiskBadge(item.disease);
                const BadgeIcon = badge.icon;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BadgeIcon className={`w-4 h-4 ${badge.color.split(" ")[0]}`} />
                        <span className="text-sm font-medium text-white">{item.disease}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-[#3B82F6]">
                        {item.confidence.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{item.date}</div>
                      <div className="text-xs text-gray-500 font-mono">{item.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-8 px-3 text-xs"
                          onClick={() => toast.info("Downloading report...")}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Report
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-gray-400 hover:bg-white/5 h-8 px-3 text-xs"
                          onClick={() => toast.info("Opening full analysis...")}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Clock className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No history found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
