"use client";

import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string | null;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  "Interview Ready": {
    bg: "bg-orange-500/10 border border-orange-500/20",
    text: "text-[#f97316]",
    label: "Interview Ready",
  },
  "Skill Gap": {
    bg: "bg-yellow-500/10 border border-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Skill Gap",
  },
  "Not Suitable": {
    bg: "bg-red-500/10 border border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    label: "Not Suitable",
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) return null;
  const config = statusConfig[status] ?? {
    bg: "bg-gray-100 border border-gray-200 dark:bg-[#1A1A1A] dark:border-[#27272A]",
    text: "text-gray-500 dark:text-[#a1a1aa]",
    label: status,
  };

  return (
    <span
      className={cn(
        "text-[10px] uppercase font-bold tracking-tight px-2 py-1 rounded",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}
