"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { compareCandidates } from "@/lib/api";
import { CompareResult, CandidateCompareItem } from "@/lib/types";
import { InitialAvatar } from "@/components/ui/InitialAvatar";
import { SkillTag } from "@/components/ui/SkillTag";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Loader2, Share2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

function CompareColumn({
  item,
  isTop,
}: {
  item: CandidateCompareItem;
  isTop: boolean;
}) {
  return (
    <div
      className={cn(
        "border-l border-gray-200 dark:border-[#2a2a2a]",
        isTop && "border-t-2 border-t-[#f97316]",
      )}
    >
      <div className="p-4 flex items-center gap-3">
        <InitialAvatar name={item.candidate.name} size="md" />
        <div>
          <h4 className="text-[14px] font-bold text-black dark:text-white">
            {item.candidate.name}
          </h4>
          <span
            className={cn(
              "text-[11px] font-medium tracking-[0.15em] uppercase",
              isTop ? "text-[#f97316]" : "text-gray-400 dark:text-[#555555]",
            )}
          >
            {item.rank ? `Rank #${item.rank}` : "Unranked"}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const candidatesParam = searchParams.get("candidates") ?? "";
  const jdId = searchParams.get("jd") ?? "";
  const candidateIds = candidatesParam.split(",").filter(Boolean);

  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const invalid = candidateIds.length < 2 || !jdId;
    if (invalid) {
      // Defer setState so it doesn't fire synchronously from the effect body.
      queueMicrotask(() => {
        if (cancelled) return;
        setError("Need at least 2 candidates and a JD to compare.");
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    compareCandidates(candidateIds, jdId)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesParam, jdId]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendForApproval = () => {
    if (!result) return;
    const topCandidate = [...result.candidates].sort(
      (a, b) => b.match_score - a.match_score,
    )[0];

    const subject = `TalentLens Candidate Selection — ${result.jd.title}`;
    
    let candidatesSummary = "";
    result.candidates.forEach((c) => {
      candidatesSummary += `- ${c.candidate.name} (Match Score: ${Math.round(c.match_score)}%, Status: ${c.shortlist_status})\n`;
      candidatesSummary += `  Matched Skills: ${c.matched_skills.slice(0, 4).join(', ') || 'None'}\n`;
      if (c.missing_skills.length > 0) {
        candidatesSummary += `  Missing Required: ${c.missing_skills.slice(0, 3).join(', ')}\n`;
      }
      candidatesSummary += `\n`;
    });

    const body = `Hi Team,

I have prepared a comparison of the top candidates evaluated for the position of ${result.jd.title}${result.jd.company ? ` at ${result.jd.company}` : ''}.

Here is a summary of the candidates evaluated:

${candidatesSummary}★ Top Recommendation:
We recommend proceeding with ${topCandidate.candidate.name}.
AI Rationale: ${topCandidate.reasoning}

You can view the full candidate leaderboard and details here:
http://localhost:3001/jd/${result.jd.id}

Please let me know if you approve proceeding to interview these candidates.

Best regards,
Hiring Team`;

    const mailtoUrl = `https://mail.google.com/mail/?view=cm&to=&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 dark:text-red-400 text-[13px]">
        {error || "Error loading comparison."}
      </div>
    );
  }

  const topCandidate = [...result.candidates].sort(
    (a, b) => b.match_score - a.match_score,
  )[0];
  const gridCols =
    result.candidates.length === 2 ? "grid-cols-3" : "grid-cols-4";

  const rows: {
    label: string;
    render: (item: CandidateCompareItem) => React.ReactNode;
  }[] = [
    {
      label: "Match Score",
      render: (item) => (
        <div>
          <ScoreBadge score={item.match_score} size="md" />
          <div className="h-1.5 w-full rounded-full overflow-hidden mt-1 bg-gray-200 dark:bg-[#141414]">
            <div
              className="h-full bg-[#f97316]"
              style={{ width: `${item.match_score}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      label: "Status",
      render: (item) => <StatusPill status={item.shortlist_status} />,
    },
    {
      label: "Matched Skills",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.matched_skills.slice(0, 4).map((s) => (
            <SkillTag key={s} skill={s} variant="matched" />
          ))}
        </div>
      ),
    },
    {
      label: "Missing Skills",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.missing_skills.slice(0, 4).map((s) => (
            <SkillTag key={s} skill={s} variant="missing" />
          ))}
          {item.missing_skills.length === 0 && (
            <span className="text-[11px] text-green-500 dark:text-green-400">
              None ✓
            </span>
          )}
        </div>
      ),
    },
    {
      label: "Bonus Skills",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.bonus_skills.slice(0, 3).map((s) => (
            <SkillTag key={s} skill={s} variant="bonus" />
          ))}
        </div>
      ),
    },
    {
      label: "AI Reasoning",
      render: (item) => (
        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-[#555555]">
          {item.reasoning?.slice(0, 120)}
          {(item.reasoning?.length ?? 0) > 120 ? "..." : ""}
        </p>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 relative overflow-hidden rounded-sm tl-panel p-4 flex gap-4 items-start">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316]" />

            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-4 border-[#f97316] flex items-center justify-center relative bg-gray-50 dark:bg-[#111111]">
                <span className="text-lg font-bold text-[#f97316]">
                  {Math.round(topCandidate.match_score)}%
                </span>
                <div className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-sm text-[8px] font-bold bg-[#f97316] text-black">
                  MATCH
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-orange-500/15 text-[#f97316]">
                  Recommended Candidate
                </span>
                <h2 className="text-[14px] font-bold text-black dark:text-white">
                  {topCandidate.candidate.name}
                </h2>
              </div>
              <p className="text-[12px] tl-muted leading-relaxed max-w-lg">
                {topCandidate.reasoning?.slice(0, 200)}
                {(topCandidate.reasoning?.length ?? 0) > 200 ? "..." : ""}
              </p>
            </div>
          </div>

          <div className="tl-panel p-4 flex flex-col justify-between">
            <div>
              <h3 className="tl-section-label mb-2">Comparison Context</h3>
              <p className="text-[14px] font-bold text-black dark:text-white leading-tight">
                {result.jd.title}
              </p>
              {result.jd.company && (
                <p className="tl-muted mt-1">{result.jd.company}</p>
              )}
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-500 dark:text-[#666666]">
                  Analysis Precision
                </span>
                <span className="text-[#f97316] font-medium">High</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-gray-200 dark:bg-[#111111]">
                <div className="h-full w-full rounded-full bg-[#f97316]" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-gray-200 overflow-hidden bg-white dark:border-[#2a2a2a] dark:bg-[#141414]">
          <div
            className={`grid ${gridCols} border-b border-gray-200 dark:border-[#2a2a2a]`}
          >
            <div className="p-3 flex flex-col justify-end bg-[#fdfbf7] dark:bg-[#111111]">
              <span className="tl-section-label">Comparison Metric</span>
            </div>
            {result.candidates.map((item, i) => (
              <CompareColumn
                key={item.candidate.id}
                item={item}
                isTop={i === 0}
              />
            ))}
          </div>

          {rows.map(({ label, render }) => (
            <div
              key={label}
              className={`grid ${gridCols} border-t border-gray-200 dark:border-[#2a2a2a]`}
            >
              <div className="p-3 flex items-center tl-section-label bg-[#fdfbf7] dark:bg-[#111111]">
                {label}
              </div>
              {result.candidates.map((item) => (
                <div
                  key={item.candidate.id}
                  className="p-3 border-l border-gray-200 bg-white text-[14px] font-bold text-black dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-white"
                >
                  {render(item)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2.5 pb-4 no-print">
          <button onClick={handlePrint} className="tl-btn-secondary">
            <Share2 size={14} /> Share Comparison Report
          </button>
          <button onClick={handleSendForApproval} className="tl-btn-primary">
            <Send size={14} /> Send Selection for Approval
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            aside,
            nav,
            header,
            .no-print,
            button,
            .tl-btn-primary,
            .tl-btn-secondary {
              display: none !important;
            }
            main {
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              height: auto !important;
            }
            body, main, html, .tl-panel {
              background: white !important;
              color: black !important;
              background-color: white !important;
            }
            .max-w-7xl {
              max-width: 100% !important;
              width: 100% !important;
              padding: 0 !important;
            }
            .tl-panel, table, tr, td, th, div {
              border-color: #d1d5db !important;
            }
          }
        `}} />
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-[#f97316]" />
          </div>
        }
      >
        <CompareContent />
      </Suspense>
    </AppLayout>
  );
}
