"use client";

import { cn } from "@/lib/utils";

interface SkillTagProps {
  skill: string;
  variant?: "default" | "matched" | "missing" | "bonus";
  className?: string;
}

const variantClasses = {
  default:
    "bg-gray-50 border border-gray-200 text-gray-500 dark:bg-[#111111] dark:border-[#2a2a2a] dark:text-[#888888]",
  matched:
    "bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/40 dark:text-green-400",
  missing:
    "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/40 dark:text-red-400",
  bonus:
    "bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/40 dark:text-blue-400",
};

export function SkillTag({ skill, variant = "default", className }: SkillTagProps) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
    >
      {skill}
    </span>
  );
}
