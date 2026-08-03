/*
 * DashboardLayout — Persistent sidebar + top nav for the app
 * Style: Clinical Nebula — glassmorphism sidebar, dark theme
 * Desktop: sidebar always visible, content offset by lg:ml-64
 * Mobile: sidebar hidden by default, slides in on hamburger click
 */
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoute, Link } from "wouter";
import {
  ScanLine,
  Clock,
  FileText,
  BarChart3,
  Settings,
  Info,
  Menu,
  X,
  User,
  Calendar,
} from "lucide-react";

const navItems = [
  { label: "Image Analysis", href: "/dashboard/analysis", icon: ScanLine, page: "analysis" },
  { label: "History", href: "/dashboard/history", icon: Clock, page: "history" },
  { label: "Reports", href: "/dashboard/reports", icon: FileText, page: "reports" },
  { label: "Performance", href: "/dashboard/metrics", icon: BarChart3, page: "metrics" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, page: "settings" },
  { label: "About", href: "/dashboard/about", icon: Info, page: "about" },
];

function NavContent({ currentPage, onItemClick }: { currentPage: string; onItemClick: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-blue-500/10">
        <img src="/manus-storage/logo-icon_ebcc78e5.png" alt="Logo" className="w-8 h-8" />
        <span className="font-display text-base font-bold tracking-tight">
          Retina<span className="text-[#3B82F6]">Vision</span>
        </span>
        <button onClick={onItemClick} className="ml-auto lg:hidden text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
            >
              <div
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-blue-500/15 text-[#3B82F6] border-l-2 border-[#3B82F6]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-500/10">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-emerald-400">Model Online</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            EfficientNet-B0 v2.1
          </div>
        </div>
      </div>
    </>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const match = useRoute("/dashboard/:page");
  const currentPage = (match && match[1]) ? match[1].page : "analysis";

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className="fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300 lg:translate-x-0"
        style={{
          background: "linear-gradient(180deg, rgba(11,18,32,0.98) 0%, rgba(15,23,42,0.98) 100%)",
          borderRight: "1px solid rgba(59,130,246,0.1)",
          transform: open ? "translateX(0)" : undefined,
        }}
      >
        <NavContent currentPage={currentPage} onItemClick={onClose} />
      </aside>
    </>
  );
}

function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6"
      style={{
        background: "rgba(11,18,32,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(59,130,246,0.08)",
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">Dr. Sarah Chen</div>
            <div className="text-[10px] text-gray-500 font-mono">PAT-2024-0847</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-mono">
          <Calendar className="w-3.5 h-3.5" />
          {dateStr}
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <span className="text-xs font-bold text-white">SC</span>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(30,58,138,0.08)_0%,_transparent_50%)]" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop: offset for sidebar. Mobile: full width */}
      <div className="relative z-10 min-h-screen lg:ml-64">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
