"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  onFilterChange: (filters: {
    branch: string;
    gender: string;
    scoreMin: number;
    scoreMax: number;
  }) => void;
}

const BRANCHES = ["CSE", "IT", "ECE", "EE", "ME", "Civil", "Other"];
const GENDERS = ["Male", "Female", "Other"];

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [branch, setBranch] = useState("");
  const [gender, setGender] = useState("");
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [showBranch, setShowBranch] = useState(false);
  const [showGender, setShowGender] = useState(false);

  const apply = (b: string, g: string, sMin: number, sMax: number) => {
    onFilterChange({ branch: b, gender: g, scoreMin: sMin, scoreMax: sMax });
  };

  const clearAll = () => {
    setBranch("");
    setGender("");
    setScoreMin(0);
    setScoreMax(100);
    apply("", "", 0, 100);
    setShowBranch(false);
    setShowGender(false);
  };

  const dropdownItem = (selected: boolean) =>
    cn(
      "w-full text-left px-3 py-1.5 text-[11px] transition-colors",
      selected
        ? "text-[#f97316]"
        : "text-gray-500 hover:bg-gray-50 dark:text-[#555555] dark:hover:bg-[#1A1A1A]",
    );

  return (
    <section className="px-4 py-2 border-b border-[#e8e2d4] flex flex-wrap gap-2 items-center relative z-30 bg-white dark:border-[#2a2a2a] dark:bg-[#111111]">
      <span className="tl-section-label mr-2">Filters</span>

      <div className="relative">
        <button
          onClick={() => {
            setShowBranch(!showBranch);
            setShowGender(false);
          }}
          className="filter-chip"
        >
          {branch ? `Branch: ${branch}` : "Branch"}
          <ChevronDown size={12} />
        </button>
        {showBranch && (
          <div className="absolute top-full left-0 mt-1 rounded-sm border border-gray-200 bg-white shadow-xl z-50 min-w-[140px] dark:border-[#2a2a2a] dark:bg-[#141414]">
            {BRANCHES.map((b) => (
              <button
                key={b}
                onClick={() => {
                  setBranch(b);
                  setShowBranch(false);
                  apply(b, gender, scoreMin, scoreMax);
                }}
                className={dropdownItem(branch === b)}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setShowGender(!showGender);
            setShowBranch(false);
          }}
          className="filter-chip"
        >
          {gender ? `Gender: ${gender}` : "Gender"}
          <ChevronDown size={12} />
        </button>
        {showGender && (
          <div className="absolute top-full left-0 mt-1 rounded-sm border border-gray-200 bg-white shadow-xl z-50 min-w-[120px] dark:border-[#2a2a2a] dark:bg-[#141414]">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGender(g);
                  setShowGender(false);
                  apply(branch, g, scoreMin, scoreMax);
                }}
                className={dropdownItem(gender === g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="filter-chip gap-2">
        <span className="text-[10px]">Score:</span>
        <input
          type="number"
          min={0}
          max={100}
          value={scoreMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            setScoreMin(v);
            apply(branch, gender, v, scoreMax);
          }}
          className="w-10 bg-transparent text-center text-[11px] text-[#f97316] font-bold outline-none"
        />
        <span className="text-[10px] opacity-50">–</span>
        <input
          type="number"
          min={0}
          max={100}
          value={scoreMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            setScoreMax(v);
            apply(branch, gender, scoreMin, v);
          }}
          className="w-10 bg-transparent text-center text-[11px] text-[#f97316] font-bold outline-none"
        />
      </div>

      {branch && (
        <span className="flex items-center gap-1 text-[10px] bg-orange-500/10 border border-orange-500/20 text-[#f97316] px-2 py-0.5 rounded">
          {branch}
          <button
            onClick={() => {
              setBranch("");
              apply("", gender, scoreMin, scoreMax);
            }}
          >
            <X size={10} />
          </button>
        </span>
      )}
      {gender && (
        <span className="flex items-center gap-1 text-[10px] bg-orange-500/10 border border-orange-500/20 text-[#f97316] px-2 py-0.5 rounded">
          {gender}
          <button
            onClick={() => {
              setGender("");
              apply(branch, "", scoreMin, scoreMax);
            }}
          >
            <X size={10} />
          </button>
        </span>
      )}

      <div className="h-5 w-px mx-2 bg-gray-200 dark:bg-[#2a2a2a]" />

      <button
        onClick={clearAll}
        className="text-[11px] text-[#f97316] hover:underline"
      >
        Clear All
      </button>
    </section>
  );
}
