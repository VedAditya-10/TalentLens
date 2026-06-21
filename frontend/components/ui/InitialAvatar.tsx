"use client";

import { getInitials } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InitialAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-[11px]",
  lg: "w-14 h-14 text-lg",
};

export function InitialAvatar({ name, size = "md", className }: InitialAvatarProps) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded font-bold flex-shrink-0 text-[#f97316]",
        "bg-gray-100 border border-gray-200",
        "dark:bg-[#1A1A1A] dark:border-[#27272A]",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
