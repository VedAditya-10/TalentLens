"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { FilterBar } from "@/components/candidates/FilterBar";
import { CandidateRow } from "@/components/candidates/CandidateRow";
import { RightInspector } from "@/components/candidates/RightInspector";
import { ActionBar } from "@/components/candidates/ActionBar";
import { getJD, getMatchesForJD, getCandidates, bulkMatch } from "@/lib/api";
import { JD, RankedCandidate, Candidate } from "@/lib/types";
import { Search, Zap, Loader2 } from "lucide-react";

export default function JDCandidatesPage() {
  const { id: jdId } = useParams<{ id: string }>();
  const [jd, setJD] = useState<JD | null>(null);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [activeRemarksId, setActiveRemarksId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    branch: "",
    gender: "",
    scoreMin: 0,
    scoreMax: 100,
  });

  const loadData = useCallback(async () => {
    if (!jdId) return;
    const [jdData, rankedData, candidatesData] = await Promise.all([
      getJD(jdId),
      getMatchesForJD(jdId, {
        branch: filters.branch || undefined,
        gender: filters.gender || undefined,
        score_min: filters.scoreMin > 0 ? filters.scoreMin : undefined,
        score_max: filters.scoreMax < 100 ? filters.scoreMax : undefined,
      }),
      getCandidates(),
    ]);
    return { jdData, rankedData, candidatesData };
  }, [jdId, filters]);

  const refreshData = useCallback(async () => {
    try {
      const result = await loadData();
      if (!result) return;
      setJD(result.jdData);
      setRanked(result.rankedData);
      setAllCandidates(result.candidatesData);
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await loadData();
        if (cancelled || !result) return;
        setJD(result.jdData);
        setRanked(result.rankedData);
        setAllCandidates(result.candidatesData);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const handleMatchAll = async () => {
    if (!jdId) return;
    const matchedIds = new Set(ranked.map((r) => r.candidate.id));
    const unmatchedIds = allCandidates
      .filter((c) => !matchedIds.has(c.id))
      .map((c) => c.id);
    if (unmatchedIds.length === 0) return;
    setMatching(true);
    try {
      await bulkMatch(unmatchedIds, jdId);
      await refreshData();
    } finally {
      setMatching(false);
    }
  };

  const toggleCheck = (id: string, checked: boolean) => {
    setCheckedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id),
    );
  };

  const selectedItem =
    ranked.find((r) => r.candidate.id === selectedId) ?? null;

  const filtered = ranked.filter(
    (r) =>
      search === "" ||
      r.candidate.name.toLowerCase().includes(search.toLowerCase()),
  );

  const unmatchedCount = allCandidates.filter(
    (c) => !ranked.find((r) => r.candidate.id === c.id),
  ).length;

  return (
    <AppLayout
      rightPanel={
        selectedItem ? (
          <RightInspector
            item={selectedItem}
            jdId={jdId}
            onClose={() => setSelectedId(null)}
          />
        ) : undefined
      }
    >
      <header className="sticky top-0 z-40 h-16 px-6 flex items-center justify-between gap-4 bg-[color:var(--bg)]/80 backdrop-blur border-b border-[#e7e5e4] dark:border-[#2a2a2a]">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-[#f0f0f0]">
            Talent Leaderboard
          </h1>
          {jd && (
            <>
              <div className="h-5 w-px bg-[#e7e5e4] dark:bg-[#2a2a2a]" />
              <span className="text-[13px] text-gray-500 dark:text-[#888] truncate">
                {jd.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates..."
              className="tl-input pl-9 pr-3 py-1.5 w-[220px] text-[13px]"
            />
          </div>

          <button
            onClick={handleMatchAll}
            disabled={matching || unmatchedCount === 0}
            className="tl-btn-primary disabled:opacity-40"
          >
            {matching ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {matching
              ? "Matching..."
              : `Match All${unmatchedCount > 0 ? ` (${unmatchedCount})` : ""}`}
          </button>
        </div>
      </header>

      <FilterBar onFilterChange={setFilters} />

      <section className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-[#f97316]" />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 border-b border-[#e8e2d4] bg-white dark:border-[#2a2a2a] dark:bg-[#111111]">
              <tr className="text-left h-[44px]">
                <th className="px-4 w-10">
                  <input type="checkbox" className="tl-checkbox" />
                </th>
                {[
                  "Rank",
                  "Candidate",
                  "Match",
                  "Branch",
                  "Key Skills",
                  "Status",
                  "Remarks",
                ].map((col) => (
                  <th
                    key={col}
                    className={`px-4 tl-section-label ${col === "Remarks" ? "text-center" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-xl text-center text-[13px] text-gray-400 dark:text-[#555555]"
                  >
                    {ranked.length === 0
                      ? "No candidates matched yet. Upload resumes and click Match All."
                      : "No candidates match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <CandidateRow
                    key={item.candidate.id}
                    item={item}
                    isSelected={selectedId === item.candidate.id}
                    isChecked={checkedIds.includes(item.candidate.id)}
                    jdId={jdId as string}
                    remarksOpen={activeRemarksId === item.candidate.id}
                    onRemarksToggle={(open) => setActiveRemarksId(open ? item.candidate.id : null)}
                    onSelect={() =>
                      setSelectedId(
                        selectedId === item.candidate.id
                          ? null
                          : item.candidate.id,
                      )
                    }
                    onCheck={(checked) =>
                      toggleCheck(item.candidate.id, checked)
                    }
                    onRemarksSaved={refreshData}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <ActionBar
        checkedIds={checkedIds}
        jdId={jdId}
        onClear={() => setCheckedIds([])}
      />
    </AppLayout>
  );
}
