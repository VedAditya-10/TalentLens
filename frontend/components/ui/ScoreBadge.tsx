"use client";

import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
  className?: string;
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const colorClass =
    score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 60
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const sizeClass = size === "sm" ? "text-[13px]" : "text-base";

  return (
    <span className={cn("font-bold tabular-nums", colorClass, sizeClass, className)}>
      {Math.round(score)}
    </span>
  );
}

interface ScoreBarProps {
  score: number;
  className?: string;
}

export function ScoreBar({ score, className }: ScoreBarProps) {
  const barColor =
    score >= 80
      ? "bg-green-500 dark:bg-green-400"
      : score >= 60
      ? "bg-yellow-500 dark:bg-yellow-400"
      : "bg-red-500 dark:bg-red-400";

  return (
    <div className={cn("w-16 h-1 bg-gray-200 dark:bg-[#27272A] rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full", barColor)}
        style={{ width: `${Math.min(100, score)}%` }}
      />
    </div>
  );
}
