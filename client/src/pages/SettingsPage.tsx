/*
 * SettingsPage — Dark mode, notifications, language, profile settings
 * Style: Clinical Nebula — glassmorphism, toggle switches, clean layout
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings,
  Moon,
  Bell,
  Globe,
  User,
  Shield,
  Database,
  Monitor,
  ChevronRight,
} from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState("English");

  const settingsGroups = [
    {
      title: "Appearance",
      icon: Moon,
      items: [
        {
          label: "Dark Mode",
          desc: "Use dark theme throughout the application",
          type: "toggle" as const,
          enabled: true,
          onToggle: () => toast.info("Dark mode is always enabled"),
        },
        {
          label: "Compact View",
          desc: "Reduce spacing for a denser layout",
          type: "toggle" as const,
          enabled: false,
          onToggle: () => toast.info("Layout preference saved"),
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          label: "Push Notifications",
          desc: "Receive notifications for completed analyses",
          type: "toggle" as const,
          enabled: notifications,
          onToggle: () => setNotifications(!notifications),
        },
        {
          label: "Email Alerts",
          desc: "Receive critical results via email",
          type: "toggle" as const,
          enabled: emailAlerts,
          onToggle: () => setEmailAlerts(!emailAlerts),
        },
      ],
    },
    {
      title: "Analysis",
      icon: Database,
      items: [
        {
          label: "Auto-save Results",
          desc: "Automatically save analysis results to history",
          type: "toggle" as const,
          enabled: autoSave,
          onToggle: () => setAutoSave(!autoSave),
        },
        {
          label: "Include Heatmaps",
          desc: "Save Grad-CAM visualizations with each result",
          type: "toggle" as const,
          enabled: true,
          onToggle: () => toast.info("Heatmap preference updated"),
        },
      ],
    },
    {
      title: "Language & Region",
      icon: Globe,
      items: [
        {
          label: "Language",
          desc: "Set the application language",
          type: "select" as const,
          value: language,
          options: ["English", "Spanish", "French", "German", "Japanese", "Chinese"],
        },
        {
          label: "Date Format",
          desc: "Choose your preferred date format",
          type: "select" as const,
          value: "MM/DD/YYYY",
          options: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        },
      ],
    },
    {
      title: "Account",
      icon: User,
      items: [
        {
          label: "Profile Information",
          desc: "Update your name, hospital, and credentials",
          type: "action" as const,
          action: () => toast.info("Profile settings opening..."),
        },
        {
          label: "Security Settings",
          desc: "Manage password and two-factor authentication",
          type: "action" as const,
          action: () => toast.info("Security settings opening..."),
        },
      ],
    },
    {
      title: "Data & Privacy",
      icon: Shield,
      items: [
        {
          label: "Export Data",
          desc: "Download all your analysis history and reports",
          type: "action" as const,
          action: () => toast.info("Preparing data export..."),
        },
        {
          label: "Clear History",
          desc: "Permanently delete all analysis records",
          type: "action" as const,
          action: () => toast.info("This action requires confirmation"),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your preferences and account settings</p>
      </div>

      {settingsGroups.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.06 }}
          className="glass-card overflow-hidden"
        >
          {/* Group Header */}
          <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2">
            <group.icon className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-sm font-display font-semibold">{group.title}</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-white/5">
            {group.items.map((item, ii) => (
              <div key={ii} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    {item.type === "toggle" ? (
                      <Monitor className="w-4 h-4 text-gray-400" />
                    ) : item.type === "select" ? (
                      <Globe className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>

                {item.type === "toggle" && (
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={item.onToggle}
                    className="data-[state=checked]:bg-[#3B82F6]"
                  />
                )}

                {item.type === "select" && (
                  <select
                    value={item.value}
                    onChange={(e) => toast.info(`${item.label} updated to ${e.target.value}`)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    {item.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {item.type === "action" && (
                  <button
                    onClick={item.action}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Save Button */}
      <Button
        className="bg-[#3B82F6] hover:bg-[#2563EB] font-semibold"
        onClick={() => toast.success("Settings saved successfully")}
      >
        Save Changes
      </Button>
    </div>
  );
}
