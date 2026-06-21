"use client";

import { RankedCandidate } from "@/lib/types";
import { InitialAvatar } from "@/components/ui/InitialAvatar";
import { SkillTag } from "@/components/ui/SkillTag";
import { StatusPill } from "@/components/ui/StatusPill";
import { X } from "lucide-react";

interface RightInspectorProps {
  item: RankedCandidate;
  onClose: () => void;
  jdId: string;
}

function MatchBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1 text-gray-400 dark:text-[#555555]">
        <span>{label}</span>
        <span className="text-[#f97316]">{pct}%</span>
      </div>
      <div className="w-full h-1 rounded-full overflow-hidden bg-gray-200 dark:bg-[#27272A]">
        <div
          className="h-full rounded-full bg-[#f97316]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RightInspector({ item, onClose, jdId }: RightInspectorProps) {
  const { candidate, match } = item;

  const totalRequired =
    (match.matched_skills?.length ?? 0) + (match.missing_skills?.length ?? 0);
  const skillPct =
    totalRequired > 0
      ? Math.round(((match.matched_skills?.length ?? 0) / totalRequired) * 100)
      : 0;

  const reasoningLines = (match.reasoning ?? "")
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#141414]">
      <div className="p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
        <div className="flex justify-between items-start mb-3">
          <InitialAvatar name={candidate.name} size="lg" />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:text-[#555555] dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-[#f0f0f0] truncate">
          {candidate.name}
        </h3>
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-gray-500 dark:text-[#666666] mt-0.5">
          {candidate.branch ?? "Candidate"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <StatusPill status={match.shortlist_status} />
          <span className="text-[12px] font-medium text-[#f97316]">
            {Math.round(match.match_score)}% Match
          </span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollbarWidth: "thin" }}
      >
        <section>
          <h4 className="tl-section-label mb-2">
            {match.rank === 1 ? "Why Ranked #1" : `Rank #${match.rank}`}
          </h4>
          <div className="p-3 rounded-sm border border-gray-200 bg-[#fdfbf7] space-y-2 dark:border-[#2a2a2a] dark:bg-[#111111]">
            {reasoningLines.length > 0 ? (
              reasoningLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <span className="text-[#f97316] mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-gray-900 dark:text-[#f0f0f0]">
                    {line}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-gray-400 dark:text-[#555555]">
                Run matching to see AI analysis.
              </p>
            )}

            {(match.missing_skills ?? []).slice(0, 1).map((skill) => (
              <div
                key={skill}
                className="flex items-start gap-2 text-[12px] opacity-50"
              >
                <span className="flex-shrink-0 text-red-500">✗</span>
                <span className="line-through text-gray-400 dark:text-[#555555]">
                  Missing: {skill}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="tl-section-label mb-2">Match Breakdown</h4>
          <div className="space-y-2">
            <MatchBar label="Skills Match" pct={skillPct} />
            <MatchBar
              label="Overall Score"
              pct={Math.round(match.match_score)}
            />
            <MatchBar
              label="Bonus Skills"
              pct={Math.min(100, (match.bonus_skills?.length ?? 0) * 15)}
            />
          </div>
        </section>

        {(match.matched_skills?.length ?? 0) > 0 && (
          <section>
            <h4 className="tl-section-label mb-1.5">Matched Skills</h4>
            <div className="flex flex-wrap gap-1">
              {match.matched_skills.map((s) => (
                <SkillTag key={s} skill={s} variant="matched" />
              ))}
            </div>
          </section>
        )}

        {(match.missing_skills?.length ?? 0) > 0 && (
          <section>
            <h4 className="tl-section-label mb-1.5">Missing Skills</h4>
            <div className="flex flex-wrap gap-1">
              {match.missing_skills.map((s) => (
                <SkillTag key={s} skill={s} variant="missing" />
              ))}
            </div>
          </section>
        )}

        {match.reasoning && (
          <section>
            <h4 className="tl-section-label mb-1.5">AI Resume Summary</h4>
            <p className="text-[12px] text-gray-400 dark:text-[#555555] leading-relaxed">
              {match.reasoning}
            </p>
          </section>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-[#2a2a2a] bg-[#fdfbf7] dark:bg-[#111111]">
        <a
          href={`/candidate/${candidate.id}/jd/${jdId}`}
          className="block w-full text-center py-2 rounded-sm font-semibold text-[12px] tracking-wider transition-opacity hover:opacity-90 bg-[#f97316] text-black"
        >
          Full Detail
        </a>
      </div>
    </div>
  );
}
