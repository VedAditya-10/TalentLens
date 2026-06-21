"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { getJDs, deleteJD, getMatchesForJD } from "@/lib/api";
import { JD } from "@/lib/types";
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Users,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface JDWithStats extends JD {
  candidateCount: number;
  topScore: number | null;
}

export default function JobDescriptionsPage() {
  const [jds, setJDs] = useState<JDWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawJDs = await getJDs();
        if (cancelled) return;
        const withStats = await Promise.all(
          rawJDs.map(async (jd) => {
            try {
              const matches = await getMatchesForJD(jd.id);
              const topScore =
                matches.length > 0 ? matches[0].match.match_score : null;
              return { ...jd, candidateCount: matches.length, topScore };
            } catch {
              return { ...jd, candidateCount: 0, topScore: null };
            }
          }),
        );
        if (!cancelled) setJDs(withStats);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (
    id: string,
    title: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This will delete the job description and all candidate match history for it.`,
      )
    ) {
      return;
    }
    try {
      await deleteJD(id);
      setJDs((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete job description.");
    }
  };

  const filteredJDs = jds.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      (j.company && j.company.toLowerCase().includes(q)) ||
      j.required_skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const scoreColor = (score: number | null) => {
    if (score === null) return "var(--on-surface-muted)";
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <header className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="tl-page-title">Job Descriptions</h1>
              <p className="tl-metadata mt-1">
                Manage job requirements and view matched candidates
              </p>
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
                  placeholder="Search job title, company, skills..."
                  className="tl-input pl-9 pr-3 py-2 w-[280px] text-[13px]"
                />
              </div>
              <Link href="/jd/create" className="tl-btn-primary">
                <Plus size={14} />
                Create JD
              </Link>
            </div>
          </header>

          <div className="tl-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#f97316]" />
              </div>
            ) : filteredJDs.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <FileText
                  size={32}
                  className="mx-auto mb-3 opacity-30 text-[#f97316]"
                />
                <p className="text-[13px] font-bold text-black dark:text-white">
                  {jds.length === 0
                    ? "No job descriptions found."
                    : "No job descriptions match your search."}
                </p>
                {jds.length === 0 && (
                  <Link
                    href="/jd/create"
                    className="text-[#f97316] text-[12px] hover:underline mt-2 inline-block"
                  >
                    Create your first JD →
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-[#e8e2d4] h-[40px] bg-[#fdfbf7] dark:border-[#2a2a2a] dark:bg-[#111111]">
                    <th className="p-3 pl-4 tl-section-label">
                      Position & Company
                    </th>
                    <th className="p-3 tl-section-label">Experience</th>
                    <th className="p-3 tl-section-label">Skills Required</th>
                    <th className="p-3 tl-section-label">Candidates</th>
                    <th className="p-3 tl-section-label">Top Score</th>
                    <th className="p-3 tl-section-label">Date Created</th>
                    <th className="p-3 pr-4 tl-section-label text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                  {filteredJDs.map((jd) => (
                    <tr
                      key={jd.id}
                      className="bg-white hover:bg-gray-50 transition-colors group h-[56px] dark:bg-[#111111] dark:hover:bg-[#141414]"
                    >
                      {/* Position and Company */}
                      <td className="p-3 pl-4">
                        <div>
                          <Link
                            href={`/jd/${jd.id}`}
                            className="text-[14px] font-bold text-black hover:underline hover:text-[#f97316] dark:text-white"
                          >
                            {jd.title}
                          </Link>
                          {jd.company && (
                            <p className="tl-muted mt-0.5">{jd.company}</p>
                          )}
                        </div>
                      </td>

                      {/* Experience required */}
                      <td className="p-3 tl-muted">
                        {jd.experience_required || "—"}
                      </td>

                      {/* Required Skills */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {jd.required_skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] px-1.5 py-0.5 rounded-sm border border-gray-200 bg-gray-50 text-gray-500 dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#888888]"
                            >
                              {s}
                            </span>
                          ))}
                          {jd.required_skills.length > 3 && (
                            <span className="text-[10px] text-[#555555]">
                              +{jd.required_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Candidate count */}
                      <td className="p-3 tl-muted">
                        <Link
                          href={`/jd/${jd.id}`}
                          className="flex items-center gap-1 hover:underline"
                        >
                          <Users
                            size={12}
                            className="text-[#f97316] opacity-60"
                          />
                          <span>{jd.candidateCount} matched</span>
                        </Link>
                      </td>

                      {/* Top match score */}
                      <td className="p-3 text-[14px] font-medium">
                        {jd.topScore !== null ? (
                          <span style={{ color: scoreColor(jd.topScore) }}>
                            {Math.round(jd.topScore)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-[#555555]">
                            —
                          </span>
                        )}
                      </td>

                      {/* Date Created */}
                      <td className="p-3 tl-muted">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>
                            {new Date(jd.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* View Candidates & Delete */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/jd/${jd.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-[#f97316] hover:text-[#f97316]/80 flex items-center gap-0.5"
                          >
                            View <ChevronRight size={12} />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(jd.id, jd.title, e)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Delete JD"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
