/*
 * ReportsPage — Generated medical reports with download/print options
 * Style: Clinical Nebula — glassmorphism cards, file list
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Printer,
  Eye,
  Calendar,
  FileCheck,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const reportsData = [
  { id: 1, patient: "PAT-2024-0847", diagnosis: "Normal", confidence: 99.91, date: "2024-08-01", type: "PDF", size: "1.2 MB" },
  { id: 2, patient: "PAT-2024-0832", diagnosis: "Retinoblastoma", confidence: 94.7, date: "2024-07-25", type: "PDF", size: "1.8 MB" },
  { id: 3, patient: "PAT-2024-0819", diagnosis: "Uveal Melanoma", confidence: 87.3, date: "2024-07-22", type: "PDF", size: "1.5 MB" },
  { id: 4, patient: "PAT-2024-0801", diagnosis: "Normal", confidence: 99.12, date: "2024-07-18", type: "PDF", size: "1.1 MB" },
  { id: 5, patient: "PAT-2024-0788", diagnosis: "Choroidal Osteoma", confidence: 82.6, date: "2024-07-15", type: "PDF", size: "2.1 MB" },
  { id: 6, patient: "PAT-2024-0775", diagnosis: "Normal", confidence: 97.88, date: "2024-07-10", type: "PDF", size: "1.0 MB" },
  { id: 7, patient: "PAT-2024-0762", diagnosis: "Retinal Capillary Hemangioma", confidence: 78.2, date: "2024-07-05", type: "PDF", size: "1.7 MB" },
];

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = reportsData.filter(
    (r) =>
      r.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Reports</h1>
          <p className="text-sm text-gray-400 mt-1">Generated medical reports and diagnoses</p>
        </div>
        <Button
          size="sm"
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-xs"
          onClick={() => toast.info("Batch export starting...")}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export All
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by patient ID or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-sm h-9 rounded-lg"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-gray-400 hover:bg-white/5 h-9"
          onClick={() => toast.info("Filter options coming soon")}
        >
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          Filter
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card p-4 flex items-center gap-4 group hover:border-blue-500/20 transition-all"
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6 text-red-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Report — {report.diagnosis}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">{report.type}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400 font-mono">{report.patient}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {report.date}
                </span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">{report.size}</span>
              </div>
            </div>

            {/* Confidence */}
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Confidence</div>
              <div className="font-mono text-sm font-semibold text-[#3B82F6]">{report.confidence.toFixed(2)}%</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toast.info("Opening report preview...")}
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 h-8 px-3 text-xs"
                onClick={() => toast.success("Report downloaded")}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-gray-400 hover:bg-white/5 h-8 px-3 text-xs"
                onClick={() => window.print()}
              >
                <Printer className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-gray-500">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No reports found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
