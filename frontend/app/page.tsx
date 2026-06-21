"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { getJDs, deleteJD, getMatchesForJD, getCandidates } from "@/lib/api";
import { JD, RankedCandidate, getInitials } from "@/lib/types";
import {
  Plus,
  FileText,
  Users,
  Zap,
  Trash2,
  ChevronRight,
  Search,
  Briefcase,
  UserCheck,
  Sparkles,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";

interface JDWithStats extends JD {
  candidateCount: number;
  topScore: number | null;
  reviewed: number;
  shortlisted: number;
  recentMatches: RankedCandidate[];
}

interface ActivityItem {
  id: string;
  type: "upload" | "match" | "shortlist" | "review";
  title: string;
  subtitle: string;
  timestamp: string;
  score?: number;
  link: string;
}

export default function DashboardPage() {
  const [jds, setJDs] = useState<JDWithStats[]>([]);
  const [candidates, setCandidates] = useState<
    Awaited<ReturnType<typeof getCandidates>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Snapshot of "now" for stable time-ago rendering.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [rawJDs, allCandidates] = await Promise.all([
          getJDs(),
          getCandidates().catch(() => []),
        ]);
        if (cancelled) return;
        const withStats = await Promise.all(
          rawJDs.map(async (jd) => {
            try {
              const matches = await getMatchesForJD(jd.id);
              if (cancelled) return null;
              const topScore =
                matches.length > 0 ? matches[0].match.match_score : null;
              const reviewed = matches.filter(
                (m) => m.match.match_score !== null,
              ).length;
              const shortlisted = matches.filter(
                (m) => m.match.shortlist_status === "Interview Ready",
              ).length;
              const recentMatches = [...matches]
                .sort(
                  (a, b) =>
                    new Date(b.match.created_at).getTime() -
                    new Date(a.match.created_at).getTime(),
                )
                .slice(0, 3);
              return {
                ...jd,
                candidateCount: matches.length,
                topScore,
                reviewed,
                shortlisted,
                recentMatches,
              };
            } catch {
              return {
                ...jd,
                candidateCount: 0,
                topScore: null,
                reviewed: 0,
                shortlisted: 0,
                recentMatches: [],
              };
            }
          }),
        );
        if (cancelled) return;
        setJDs(withStats.filter((j): j is JDWithStats => j !== null));
        setCandidates(allCandidates);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this job description and all its match records?"))
      return;
    await deleteJD(id);
    setJDs((prev) => prev.filter((j) => j.id !== id));
  };

  // ── Derived metrics ────────────────────────────────────────────────────────
  const totalCandidates = jds.reduce((a, j) => a + j.candidateCount, 0);
  const totalShortlisted = jds.reduce((a, j) => a + j.shortlisted, 0);
  const totalReviewed = jds.reduce((a, j) => a + j.reviewed, 0);
  const totalMatches = totalCandidates;

  const filteredJDs = jds.filter((jd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      jd.title.toLowerCase().includes(q) ||
      (jd.company && jd.company.toLowerCase().includes(q)) ||
      jd.required_skills.some((s) => s.toLowerCase().includes(q)) ||
      (jd.description && jd.description.toLowerCase().includes(q))
    );
  });

  // ── Top candidates (best scores across all JDs) ───────────────────────────
  const topCandidates: RankedCandidate[] = jds
    .flatMap((jd) => jd.recentMatches)
    .sort((a, b) => b.match.match_score - a.match.match_score)
    .slice(0, 5);

  // ── Recent activity (synthesized from JDs + candidates) ────────────────────
  const activity: ActivityItem[] = [
    ...jds.slice(0, 3).map((jd) => ({
      id: `jd-${jd.id}`,
      type: "match" as const,
      title: `Match run completed for ${jd.title}`,
      subtitle: `${jd.candidateCount} candidates evaluated`,
      timestamp: jd.created_at,
      link: `/jd/${jd.id}`,
    })),
    ...candidates.slice(0, 4).map((c) => ({
      id: `c-${c.id}`,
      type: "upload" as const,
      title: `${c.name} added to pipeline`,
      subtitle: c.resume_filename,
      timestamp: c.created_at,
      link: `/candidates`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 6);

  const timeAgo = (iso: string) => {
    const diff = now - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* ── Header ────────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="tl-page-title">Dashboard</h1>
              <p className="tl-metadata mt-1">
                Your recruitment command center — at a glance
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search candidates, jobs, skills..."
                  className="tl-input pl-9 pr-3 py-2 w-[300px] text-[13px]"
                />
              </div>
              <Link href="/jd/create" className="tl-btn-secondary">
                <FileText size={14} />
                Create JD
              </Link>
              <Link href="/upload" className="tl-btn-primary">
                <Plus size={14} />
                Upload Resume
              </Link>
            </div>
          </header>

          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-4 gap-4">
            <KpiCard
              label="Active Jobs"
              value={jds.length}
              icon={Briefcase}
              supporting={`${jds.filter((j) => j.topScore !== null).length} with matches`}
            />
            <KpiCard
              label="Candidates Screened"
              value={totalReviewed}
              icon={Users}
              supporting={`${candidates.length} total in pipeline`}
            />
            <KpiCard
              label="Shortlisted"
              value={totalShortlisted}
              icon={UserCheck}
              supporting="Interview ready"
              accent
            />
            <KpiCard
              label="Matches Generated"
              value={totalMatches}
              icon={Sparkles}
              supporting="AI-powered scoring"
            />
          </section>

          {/* ── Main two-column layout ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-6">
            {/* ── Job Descriptions (2 cols) ──────────────────────────────── */}
            <section className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="tl-section-title">Job Descriptions</h2>
                <Link
                  href="/jd"
                  className="text-[12px] font-semibold text-[#f97316] hover:text-[#ea580c] inline-flex items-center gap-1"
                >
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>

              {loading ? (
                <div className="tl-card p-8 text-center text-[13px] text-gray-500">
                  Loading...
                </div>
              ) : jds.length === 0 ? (
                <div className="tl-card p-10 text-center">
                  <FileText
                    size={28}
                    className="mx-auto mb-3 text-gray-300 dark:text-[#444]"
                  />
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-[#f0f0f0]">
                    No job descriptions yet
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1">
                    Create your first JD to start matching candidates
                  </p>
                  <Link
                    href="/jd/create"
                    className="tl-btn-primary mt-4 inline-flex"
                  >
                    <Plus size={14} />
                    Create your first JD
                  </Link>
                </div>
              ) : filteredJDs.length === 0 ? (
                <div className="tl-card p-10 text-center text-gray-500">
                  <Search
                    size={28}
                    className="mx-auto mb-3 opacity-30 text-[#f97316]"
                  />
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-[#f0f0f0]">
                    No matching JDs found
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1">
                    Try refining your search terms
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJDs.map((jd) => (
                    <JDProgressCard
                      key={jd.id}
                      jd={jd}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Right column: Top Candidates + Recent Activity ─────────── */}
            <aside className="space-y-6">
              {/* Top Candidates */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="tl-section-title flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#f97316]" />
                    Top Candidates
                  </h2>
                  <Link
                    href="/candidates"
                    className="text-[12px] font-semibold text-[#f97316] hover:text-[#ea580c]"
                  >
                    View all
                  </Link>
                </div>
                <div className="tl-card divide-y divide-[#e7e5e4] dark:divide-[#2a2a2a] overflow-hidden">
                  {topCandidates.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-gray-500">
                      No matches yet
                    </div>
                  ) : (
                    topCandidates.map((rc) => {
                      const score = Math.round(rc.match.match_score);
                      const scoreColor =
                        score >= 80
                          ? "text-green-600 dark:text-green-400"
                          : score >= 60
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400";
                      const jd = jds.find((j) => j.id === rc.match.jd_id);
                      return (
                        <Link
                          key={rc.match.id}
                          href={`/candidate/${rc.candidate.id}/jd/${rc.match.jd_id}`}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50/70 dark:hover:bg-[#1a1a1a] transition-colors"
                        >
                          <div className="initial-avatar flex-shrink-0">
                            {getInitials(rc.candidate.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900 dark:text-[#f0f0f0] truncate">
                              {rc.candidate.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-[#888] truncate">
                              {jd?.title || "Position"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-[15px] font-bold ${scoreColor}`}
                            >
                              {score}%
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-[#666]">
                              {timeAgo(rc.match.created_at)}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Recent Activity */}
              <section>
                <h2 className="tl-section-title flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-[#f97316]" />
                  Recent Activity
                </h2>
                <div className="tl-card p-1">
                  {activity.length === 0 ? (
                    <div className="p-6 text-center text-[12px] text-gray-500">
                      No recent activity
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#e7e5e4] dark:divide-[#2a2a2a]">
                      {activity.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.link}
                            className="flex items-start gap-3 p-3 rounded-md hover:bg-gray-50/70 dark:hover:bg-[#1a1a1a] transition-colors"
                          >
                            <div
                              className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.type === "upload"
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                                  : item.type === "shortlist"
                                    ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
                                    : "bg-orange-50 text-[#f97316] dark:bg-orange-950 dark:text-[#f97316]"
                              }`}
                            >
                              {item.type === "upload" ? (
                                <Users size={12} />
                              ) : item.type === "shortlist" ? (
                                <UserCheck size={12} />
                              ) : (
                                <Zap size={12} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-medium text-gray-900 dark:text-[#f0f0f0] leading-snug">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-[#888] truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-[#666] flex-shrink-0 mt-0.5">
                              <Clock size={10} />
                              {timeAgo(item.timestamp)}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  supporting,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  supporting: string;
  accent?: boolean;
}) {
  return (
    <div className="tl-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="tl-card-label">{label}</p>
          <p
            className={`text-[36px] font-bold leading-none mt-2 tracking-tight ${
              accent ? "text-[#f97316]" : "text-gray-900 dark:text-[#f0f0f0]"
            }`}
          >
            {value.toLocaleString()}
          </p>
          <p className="text-[11.5px] text-gray-500 dark:text-[#888] mt-2 flex items-center gap-1">
            <Icon
              size={11}
              className={accent ? "text-[#f97316]" : "text-gray-400"}
            />
            {supporting}
          </p>
        </div>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            accent
              ? "bg-orange-50 text-[#f97316] dark:bg-orange-950/40"
              : "bg-gray-100 text-gray-500 dark:bg-[#1a1a1a] dark:text-[#888]"
          }`}
        >
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

// ── JD Progress Card (densified) ────────────────────────────────────────────
function JDProgressCard({
  jd,
  onDelete,
}: {
  jd: JDWithStats;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const total = Math.max(jd.candidateCount, 1);
  const reviewedPct = Math.min(100, (jd.reviewed / total) * 100);
  const shortlistedPct = Math.min(100, (jd.shortlisted / total) * 100);
  const scoreColor = (s: number | null) => {
    if (s === null) return "text-gray-400";
    if (s >= 80) return "text-green-600 dark:text-green-400";
    if (s >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="tl-card-interactive p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-[#f0f0f0] truncate">
              {jd.title}
            </h3>
            {jd.company && (
              <span className="text-[12px] text-gray-500 dark:text-[#888] truncate">
                · {jd.company}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-gray-500 dark:text-[#888]">
            <span className="inline-flex items-center gap-1">
              <Briefcase size={11} /> Engineering
            </span>
            <span>·</span>
            <span>Created {new Date(jd.created_at).toLocaleDateString()}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {jd.topScore !== null && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Top match
              </p>
              <p className={`text-[18px] font-bold ${scoreColor(jd.topScore)}`}>
                {Math.round(jd.topScore)}%
              </p>
            </div>
          )}
          <button
            onClick={(e) => onDelete(jd.id, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 ml-2"
            aria-label="Delete JD"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Skills */}
      {jd.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {jd.required_skills.slice(0, 5).map((s) => (
            <span key={s} className="skill-tag">
              {s}
            </span>
          ))}
          {jd.required_skills.length > 5 && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-[#888] px-1">
              +{jd.required_skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Progress Indicators */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#e7e5e4] dark:border-[#2a2a2a]">
        <ProgressStat
          label="Matched"
          value={jd.candidateCount}
          pct={100}
          color="bg-[#f97316]"
        />
        <ProgressStat
          label="Reviewed"
          value={jd.reviewed}
          pct={reviewedPct}
          color="bg-blue-500"
        />
        <ProgressStat
          label="Shortlisted"
          value={jd.shortlisted}
          pct={shortlistedPct}
          color="bg-green-500"
        />
      </div>

      <Link
        href={`/jd/${jd.id}`}
        className="mt-4 flex items-center justify-center gap-1 text-[#f97316] text-[12px] font-semibold hover:text-[#ea580c] pt-3 border-t border-[#e7e5e4] dark:border-[#2a2a2a]"
      >
        View Candidates <ChevronRight size={12} />
      </Link>
    </div>
  );
}

function ProgressStat({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-gray-500 dark:text-[#888]">
          {label}
        </span>
        <span className="text-[14px] font-bold text-gray-900 dark:text-[#f0f0f0]">
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
