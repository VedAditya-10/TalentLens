"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight, Archive, Download } from "lucide-react";

interface ActionBarProps {
  checkedIds: string[];
  jdId: string;
  onClear: () => void;
}

export function ActionBar({ checkedIds, jdId, onClear }: ActionBarProps) {
  const router = useRouter();
  const count = checkedIds.length;

  if (count < 1) return null;

  const handleCompare = () => {
    if (count < 2) return;
    router.push(`/compare?candidates=${checkedIds.join(",")}&jd=${jdId}`);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-4 px-5 py-2.5 rounded-full border border-gray-200 bg-white shadow-lg dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-action-bar">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-black bg-[#f97316]">
            {count}
          </span>
          <span className="text-[13px] font-semibold text-[#f97316]">Selected</span>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-[#555555] dark:hover:text-white transition-colors ml-1.5"
          >
            Clear
          </button>
        </div>

        <div className="h-5 w-px bg-gray-200 dark:bg-[#2a2a2a]" />

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-[#f97316] transition-colors dark:text-[#555555]">
            <Download size={14} />
            Export CSV
          </button>

          <button className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-[#f97316] transition-colors dark:text-[#555555]">
            <Archive size={14} />
            Shortlist
          </button>

          <button
            onClick={handleCompare}
            disabled={count < 2}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wider transition-opacity disabled:opacity-40 bg-[#f97316] text-black"
          >
            <ArrowLeftRight size={14} />
            Compare Selected ({count})
          </button>
        </div>
      </div>
    </div>
  );
}
