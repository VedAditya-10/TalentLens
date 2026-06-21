"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Cpu,
  Globe,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import { getSystemSettings } from "@/lib/api";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [apiStatus, setApiStatus] = useState<
    "checking" | "connected" | "failed"
  >("checking");
  const [modelName, setModelName] = useState("google/gemini-2.5-flash");
  const [apiEndpoint] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSystemSettings();
        setModelName(data.openrouter_model);
        setApiStatus("connected");
      } catch (e) {
        console.error("Failed to load settings:", e);
        setApiStatus("failed");
      }
    };
    loadSettings();
  }, []);

  const themeBtn = (active: boolean) =>
    cn(
      "px-4 py-1.5 rounded-[10px] font-semibold text-[12px] tracking-wide border transition-all duration-150",
      active
        ? "bg-[#f97316] text-black border-transparent"
        : "bg-white text-gray-700 border-[#e7e5e4] hover:bg-gray-50 dark:bg-[#0a0a0a] dark:border-[#2a2a2a] dark:text-[#cccccc] dark:hover:bg-[#141414]",
    );

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <header>
            <h1 className="tl-page-title">System Settings</h1>
            <p className="tl-metadata mt-1">
              Configure and inspect TalentLens system details
            </p>
          </header>

          <div className="tl-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="text-[#f97316]" size={16} />
                <h2 className="text-[13px] font-medium tracking-wider uppercase text-gray-900 dark:text-[#f0f0f0]">
                  AI Model (OpenRouter)
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {apiStatus === "checking" && (
                  <span className="text-[11px] text-gray-400 dark:text-[#555555]">
                    Checking status...
                  </span>
                )}
                {apiStatus === "connected" && (
                  <span className="flex items-center gap-1 text-[11px] text-green-500 dark:text-green-400 font-semibold">
                    <CheckCircle size={12} /> Active
                  </span>
                )}
                {apiStatus === "failed" && (
                  <span className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 font-semibold">
                    <AlertTriangle size={12} /> Offline
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[12px]">
              <div>
                <p className="font-semibold mb-1 text-gray-500 dark:text-[#555555]">
                  Selected LLM Model
                </p>
                <input
                  type="text"
                  disabled
                  value={modelName}
                  className="w-full px-3 py-1.5 rounded-sm opacity-80 tl-input"
                />
                <p className="text-[10px] mt-1 tl-muted">
                  Powered by OpenRouter. Set OPENROUTER_MODEL env var to switch models.
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-gray-500 dark:text-[#555555]">
                  Backend REST API URL
                </p>
                <input
                  type="text"
                  disabled
                  value={apiEndpoint}
                  className="w-full px-3 py-1.5 rounded-sm opacity-80 tl-input"
                />
                <p className="text-[10px] mt-1 tl-muted">
                  Configured via `NEXT_PUBLIC_API_URL`.
                </p>
              </div>
            </div>
          </div>

          <div className="tl-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="text-[#f97316]" size={16} />
              <h2 className="text-[13px] font-medium tracking-wider uppercase text-gray-900 dark:text-[#f0f0f0]">
                Theme Settings
              </h2>
            </div>

            <div className="flex items-center justify-between text-[12px] pt-1">
              <div>
                <p className="font-semibold text-gray-900 dark:text-[#f0f0f0]">
                  Application Color Theme
                </p>
                <p className="text-[10px] tl-muted">
                  Toggle between Fidelity Light and Obsidian Dark.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={themeBtn(theme === "dark")}
                >
                  Obsidian Dark
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={themeBtn(theme === "light")}
                >
                  Fidelity Light
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
