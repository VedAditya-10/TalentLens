"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  Upload,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/jd", label: "Job Descriptions", icon: FileText },
  { href: "/compare", label: "Comparison", icon: ArrowLeftRight },
  { href: "/upload", label: "Upload", icon: Upload },
];

const navLinkBase =
  "flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-md transition-colors duration-150 text-[13px] font-medium border-l-[1.5px]";

const navLinkInactive =
  "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 dark:text-[#888888] dark:hover:text-[#f0f0f0] dark:hover:bg-[#1a1a1a]";

const navLinkActive =
  "bg-orange-50/80 text-[#f97316] border-[#f97316] dark:bg-[#1a1a1a] dark:text-[#f97316] dark:border-[#f97316]";

const bottomLink =
  "w-full flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-md transition-colors duration-150 text-[13px] border-l-[1.5px] border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 dark:text-[#888888] dark:hover:text-[#f0f0f0] dark:hover:bg-[#1a1a1a]";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed h-full w-[208px] left-0 top-0 z-50 flex flex-col py-3 border-r border-[#e7e5e4] bg-white dark:border-[#2a2a2a] dark:bg-[#111111]">
      {/* Brand */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-[15px] font-black tracking-[0.12em] text-gray-900 dark:text-[#f0f0f0] uppercase">
              Talent<span className="text-[#f97316]">Lens</span>
            </h1>
            <span className="text-[9px] font-semibold tracking-[0.2em] text-gray-400 dark:text-[#555] uppercase mt-0.5">
              v1.0 · Recruiter
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-[#1a1a1a] border border-transparent">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
          </span>
          <span className="text-[10px] font-medium text-gray-600 dark:text-[#888]">
            Powered by OpenRouter
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-[1px]">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              navLinkBase,
              isActive(href) ? navLinkActive : navLinkInactive,
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto flex flex-col space-y-[1px]">
        <div className="px-3 mb-2">
          <Link
            href="/upload"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-[10px] font-semibold text-[12px] tracking-wider transition-all duration-150 hover:bg-[#ea580c] active:scale-[0.98] bg-[#f97316] text-black"
          >
            <Plus size={14} />
            New Search
          </Link>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(bottomLink, "text-left")}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <Link href="#" className={bottomLink}>
          <HelpCircle size={14} />
          <span>Help Center</span>
        </Link>

        <div className="mx-3 my-1 border-t border-[#e7e5e4] dark:border-[#2a2a2a]" />

        <Link href="/settings" className={bottomLink}>
          <Settings size={14} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
