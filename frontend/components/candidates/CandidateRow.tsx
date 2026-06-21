"use client";

import { useState } from "react";
import { RankedCandidate } from "@/lib/types";
import { InitialAvatar } from "@/components/ui/InitialAvatar";
import { ScoreBadge, ScoreBar } from "@/components/ui/ScoreBadge";
import { SkillTag } from "@/components/ui/SkillTag";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";
import { FileText, X, Loader2 } from "lucide-react";
import { updateRemarks } from "@/lib/api";

interface CandidateRowProps {
  item: RankedCandidate;
  isSelected: boolean;
  isChecked: boolean;
  jdId: string;
  remarksOpen: boolean;
  onRemarksToggle: (open: boolean) => void;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
  onRemarksSaved?: () => void;
}

export function CandidateRow({
  item,
  isSelected,
  isChecked,
  jdId,
  remarksOpen,
  onRemarksToggle,
  onSelect,
  onCheck,
  onRemarksSaved,
}: CandidateRowProps) {
  const { candidate, match } = item;
  const rank = match.rank ?? 99;
  const isRankOne = rank === 1;

  const [saving, setSaving] = useState(false);

  const handleSave = async (remarks: string, outcome: string) => {
    setSaving(true);
    try {
      await updateRemarks(candidate.id, jdId, remarks, outcome);
      onRemarksToggle(false);
      if (onRemarksSaved) {
        onRemarksSaved();
      }
    } catch (err) {
      console.error("Failed to save remarks:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-l-2 transition-colors duration-150 h-[56px] border-b border-gray-200 dark:border-[#2a2a2a]",
        isSelected
          ? "border-l-[#f97316] bg-orange-500/5 dark:bg-[#1a1a1a]"
          : "border-l-transparent bg-white hover:bg-gray-50 dark:bg-[#111111] dark:hover:bg-[#141414]",
        remarksOpen && "relative z-30"
      )}
    >
      <td className="px-4 w-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck(e.target.checked)}
          className="tl-checkbox"
        />
      </td>

      <td className="px-4">
        {isRankOne ? (
          <span
            className="w-6 h-6 flex items-center justify-center rounded-sm text-black font-bold text-[10px]"
            style={{
              backgroundColor: "#f97316",
              boxShadow: "0 0 12px rgba(249,115,22,0.25)",
            }}
          >
            #1
          </span>
        ) : (
          <span className="text-[12px] font-medium text-gray-400 dark:text-[#555555]">
            #{rank}
          </span>
        )}
      </td>

      <td className="px-4">
        <div className="flex items-center gap-3">
          <InitialAvatar name={candidate.name} size="md" />
          <div>
            <p className="text-[14px] font-medium text-gray-900 dark:text-[#f0f0f0]">
              {candidate.name}
            </p>
            <p className="text-[12px] text-gray-400 dark:text-[#555555]">
              {candidate.branch ?? "—"}
              {candidate.gender ? ` · ${candidate.gender}` : ""}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4">
        <div className="flex items-center gap-2">
          <ScoreBadge score={match.match_score} size="sm" />
          <ScoreBar score={match.match_score} />
        </div>
      </td>

      <td className="px-4 text-[12px] text-gray-400 dark:text-[#555555]">
        {candidate.branch ?? "—"}
      </td>

      <td className="px-4">
        <div className="flex gap-1 flex-wrap">
          {(match.matched_skills ?? []).slice(0, 3).map((skill) => (
            <SkillTag key={skill} skill={skill} />
          ))}
        </div>
      </td>

      <td className="px-4 text-right">
        <StatusPill status={match.shortlist_status} />
      </td>

      <td className="px-4 text-center relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onRemarksToggle(!remarksOpen)}
          className={cn(
            "p-1.5 rounded-lg border transition-all duration-150 relative",
            match.interview_remarks
              ? "text-[#f97316] border-[#f97316]/20 bg-[#f97316]/10 hover:bg-[#f97316]/20"
              : "text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600 dark:text-[#555555] dark:hover:bg-[#1a1a1a] dark:hover:text-[#888888]"
          )}
        >
          <FileText size={16} className={cn(match.interview_remarks && "fill-[#f97316]/10")} />
          {match.interview_outcome && match.interview_outcome !== "Pending" && (
            <span
              className={cn(
                "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-[#111]",
                match.interview_outcome === "Selected" && "bg-green-500",
                match.interview_outcome === "Interviewed" && "bg-blue-500",
                match.interview_outcome === "Rejected" && "bg-red-500"
              )}
            />
          )}
        </button>

        {remarksOpen && (
          <RemarksPopup
            initialRemarks={match.interview_remarks || ""}
            initialOutcome={match.interview_outcome || "Pending"}
            saving={saving}
            onClose={() => onRemarksToggle(false)}
            onSave={handleSave}
          />
        )}
      </td>
    </tr>
  );
}

interface RemarksPopupProps {
  initialRemarks: string;
  initialOutcome: string;
  saving: boolean;
  onClose: () => void;
  onSave: (remarks: string, outcome: string) => void;
}

function RemarksPopup({
  initialRemarks,
  initialOutcome,
  saving,
  onClose,
  onSave,
}: RemarksPopupProps) {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [outcome, setOutcome] = useState(initialOutcome);

  return (
    <div className="absolute right-4 top-full mt-2 z-50 w-72 p-4 bg-white dark:bg-[#141414] border border-[#e7e5e4] dark:border-[#2a2a2a] rounded-xl shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2a2a2a] pb-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-900 dark:text-[#f0f0f0]">
          Interview Remarks
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-1 text-left">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#555555]">
          Outcome Status
        </label>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="w-full text-[12px] px-2.5 py-1.5 tl-input"
        >
          <option value="Pending">Pending</option>
          <option value="Interviewed">Interviewed</option>
          <option value="Selected">Selected</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-1 text-left">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#555555]">
          Remarks
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Enter interview details, notes, etc..."
          className="w-full text-[12px] px-2.5 py-1.5 tl-input resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#cccccc] hover:bg-gray-200 dark:hover:bg-[#252525] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(remarks, outcome)}
          className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#f97316] text-white hover:bg-[#ea580c] disabled:opacity-50 transition-colors inline-flex items-center gap-1 dark:text-black"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
