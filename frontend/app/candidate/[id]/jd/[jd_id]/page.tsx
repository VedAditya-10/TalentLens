"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCandidate, getMatchRecord, getJD } from "@/lib/api";
import { CandidateDetail, MatchRecord, JD } from "@/lib/types";
import { InitialAvatar } from "@/components/ui/InitialAvatar";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Star,
  Loader2,
  Sparkles,
  Briefcase,
  Award,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Check,
  AlertTriangle,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CandidateDetailPage() {
  const { id: candidateId, jd_id: jdId } = useParams<{
    id: string;
    jd_id: string;
  }>();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [jd, setJd] = useState<JD | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, m, j] = await Promise.all([
          getCandidate(candidateId),
          getMatchRecord(candidateId, jdId),
          getJD(jdId),
        ]);
        setCandidate(c);
        setMatch(m);
        setJd(j);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [candidateId, jdId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 size={32} className="animate-spin text-[#f97316]" />
        </div>
      </AppLayout>
    );
  }

  if (!candidate || !match) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-[13px] text-gray-400 dark:text-[#555555]">
          Candidate or match record not found.
        </div>
      </AppLayout>
    );
  }

  const analysis = candidate.ai_analysis;
  
  // Calculate match percentage breakdown
  const totalRequired = (match.matched_skills?.length || 0) + (match.missing_skills?.length || 0);
  const skillMatchPct = totalRequired > 0 
    ? Math.round(((match.matched_skills?.length || 0) / totalRequired) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Back Navigation */}
          <Link
            href={`/jd/${jdId}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:text-[#f97316] text-gray-500 dark:text-[#888]"
          >
            <ArrowLeft size={14} /> Back to Leaderboard
          </Link>

          {/* Header Section (Inspired by Aura Recruit OS) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 tl-panel">
            <div className="flex items-center gap-4">
              <InitialAvatar name={candidate.name} size="lg" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[24px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                    {candidate.name}
                  </h1>
                  {match.rank && (
                    <span className="bg-[#f97316]/10 text-[#f97316] text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                      RANK #{match.rank}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-[12px] text-gray-500 dark:text-[#888]">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-[#f97316]" /> 
                    {candidate.branch || "General / Remote"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-[#cccccc]">
                    Match Score: {match.match_score}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
              <a
                href={buildInterviewMailto(candidate, jd)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-bold text-black bg-[#f97316] hover:bg-[#ea580c] transition-all active:scale-[0.98] no-underline"
              >
                <Mail size={14} />
                Schedule Interview
              </a>
              <a
                href={buildOfferMailto(candidate, match, jd)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-black bg-white border border-[#e7e5e4] hover:bg-gray-50 dark:bg-[#141414] dark:border-[#2a2a2a] dark:text-[#cccccc] dark:hover:text-white dark:hover:bg-[#1a1a1a] transition-all no-underline"
              >
                <Mail size={14} />
                Send Offer
              </a>
            </div>
          </div>

          {/* Two-column layout: 2/3 Main | 1/3 Sidebar */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* Left Column (2/3) */}
            <div className="col-span-2 space-y-6">
              
              {/* AI Rationale Card */}
              <div className="tl-panel p-6 space-y-4">
                <h2 className="text-[13px] font-bold tracking-wider uppercase text-[#f97316] flex items-center gap-2">
                  <Sparkles size={14} /> AI Rationale: Why Ranked #{match.rank || 1}
                </h2>
                
                <p className="text-[14px] leading-relaxed text-gray-800 dark:text-[#cccccc] font-medium border-l-4 border-[#f97316] pl-4 italic">
                  &ldquo;{match.reasoning ?? "No reasoning available."}&rdquo;
                </p>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#e7e5e4] dark:border-[#2a2a2a]">
                  {/* Strengths */}
                  <div>
                    <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-green-600 dark:text-green-400 mb-3 flex items-center gap-1.5">
                      <CheckCircle size={14} /> Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {match.matched_skills?.slice(0, 4).map((skill) => (
                        <li key={skill} className="flex items-start gap-2 text-[12.5px] text-gray-700 dark:text-[#b5b5b5]">
                          <Check size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span>Demonstrates solid competency in <strong className="text-gray-900 dark:text-white font-semibold">{skill}</strong>.</span>
                        </li>
                      ))}
                      {(!match.matched_skills || match.matched_skills.length === 0) && (
                        <li className="text-[12px] text-gray-400">No key strengths extracted.</li>
                      )}
                    </ul>
                  </div>

                  {/* Considerations */}
                  <div>
                    <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase text-red-500 dark:text-red-400 mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-red-500" /> Key Considerations
                    </h3>
                    <ul className="space-y-2">
                      {match.missing_skills?.slice(0, 4).map((skill) => (
                        <li key={skill} className="flex items-start gap-2 text-[12.5px] text-gray-700 dark:text-[#b5b5b5]">
                          <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <span>Lacks explicit resume evidence of <strong className="text-gray-900 dark:text-white font-semibold">{skill}</strong>.</span>
                        </li>
                      ))}
                      {(!match.missing_skills || match.missing_skills.length === 0) && (
                        <li className="text-[12px] text-gray-400">All required skills are covered. No major missing skills!</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Technical Depth Analysis Grid */}
              <div className="tl-panel p-6 space-y-4">
                <h2 className="text-[13px] font-bold tracking-wider uppercase text-[#f97316] flex items-center gap-2">
                  <Award size={14} /> Technical Depth Analysis
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Matched Skills Container */}
                  <div className="p-4 bg-gray-50/50 dark:bg-[#111] rounded-xl border border-[#e7e5e4] dark:border-[#2a2a2a] space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} /> Matched Required Skills ({match.matched_skills?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {match.matched_skills?.map((skill) => (
                        <span 
                          key={skill} 
                          className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-400"
                        >
                          {skill}
                        </span>
                      ))}
                      {(!match.matched_skills || match.matched_skills.length === 0) && (
                        <span className="text-[12px] text-gray-400">None</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills Container */}
                  <div className="p-4 bg-gray-50/50 dark:bg-[#111] rounded-xl border border-[#e7e5e4] dark:border-[#2a2a2a] space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400 flex items-center gap-1">
                      <XCircle size={12} /> Missing Required Skills ({match.missing_skills?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {match.missing_skills?.map((skill) => (
                        <span 
                          key={skill} 
                          className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400"
                        >
                          {skill}
                        </span>
                      ))}
                      {(!match.missing_skills || match.missing_skills.length === 0) && (
                        <span className="text-[12px] text-gray-400">None</span>
                      )}
                    </div>
                  </div>

                  {/* Bonus Skills Container (Full Width) */}
                  {match.bonus_skills && match.bonus_skills.length > 0 && (
                    <div className="col-span-2 p-4 bg-gray-50/50 dark:bg-[#111] rounded-xl border border-[#e7e5e4] dark:border-[#2a2a2a] space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> Additional Bonus Skills ({match.bonus_skills.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {match.bonus_skills.map((skill) => (
                          <span 
                            key={skill} 
                            className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800/40 dark:text-blue-400"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Timeline */}
              {analysis && (analysis.extracted_experience?.length ?? 0) > 0 && (
                <div className="tl-panel p-6 space-y-4">
                  <h2 className="text-[13px] font-bold tracking-wider uppercase text-[#f97316] flex items-center gap-2">
                    <Briefcase size={14} /> Professional Experience
                  </h2>
                  <div className="border-l-2 ml-3 pl-5 space-y-6 border-[#e8e2d4] dark:border-[#2a2a2a]">
                    {analysis.extracted_experience.map((exp, i) => (
                      <div key={i} className="relative">
                        <div
                          className={cn(
                            "absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#141414]",
                            i === 0
                              ? "bg-[#f97316]"
                              : "bg-gray-400 dark:bg-[#444]",
                          )}
                        />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-[14px] font-bold text-gray-900 dark:text-white">
                            {exp.role}
                          </h4>
                          <span className="text-[11px] font-semibold text-gray-400 dark:text-[#666]">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-[#f97316] mt-0.5">
                          {exp.company}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column (1/3) */}
            <div className="space-y-6">
              
              {/* Match Breakdown Progress Bars */}
              <div className="tl-panel p-5 space-y-4">
                <h3 className="text-[12px] font-bold tracking-wider uppercase text-gray-500 dark:text-[#888]">
                  Match Breakdown
                </h3>
                
                <div className="space-y-4">
                  {/* Skill Match Ratio */}
                  <ProgressBar 
                    label="Technical Skills Match" 
                    value={skillMatchPct} 
                    color="bg-green-500" 
                  />
                  
                  {/* Match Score */}
                  <ProgressBar 
                    label="AI Match Confidence" 
                    value={match.match_score} 
                    color="bg-[#f97316]" 
                  />

                  {/* Project Experience Relevance (synthetic example based on rank) */}
                  <ProgressBar 
                    label="Role Relevance" 
                    value={match.match_score >= 80 ? 94 : match.match_score >= 60 ? 75 : 45} 
                    color="bg-blue-500" 
                  />
                </div>
              </div>

              {/* Candidate Information / Logistics & Metadata */}
              <div className="tl-panel p-5 space-y-4">
                <h3 className="text-[12px] font-bold tracking-wider uppercase text-gray-500 dark:text-[#888]">
                  Logistics & Metadata
                </h3>
                
                <div className="space-y-3">
                  <MetadataItem label="Email Address" value={candidate.email} icon={Mail} />
                  <MetadataItem label="Phone Number" value={candidate.phone} icon={Phone} />
                  <MetadataItem label="Branch / Specialization" value={candidate.branch} icon={Award} />
                  <MetadataItem label="Gender" value={candidate.gender} icon={User} />
                  <MetadataItem 
                    label="Added to Pipeline" 
                    value={new Date(candidate.created_at).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} 
                    icon={Calendar} 
                  />
                </div>
              </div>

              {/* Education Section */}
              {analysis && (analysis.extracted_education?.length ?? 0) > 0 && (
                <div className="tl-panel p-5 space-y-4">
                  <h3 className="text-[12px] font-bold tracking-wider uppercase text-gray-500 dark:text-[#888]">
                    Education
                  </h3>
                  <div className="space-y-4">
                    {analysis.extracted_education.map((edu, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">
                          {edu.degree}
                        </p>
                        <p className="text-[11px] font-medium text-[#f97316]">
                          {edu.institution}
                        </p>
                        {edu.year && (
                          <p className="text-[10px] text-gray-400 dark:text-[#666]">
                            Class of {edu.year}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── UI Helper: Progress Bar ──────────────────────────────────────────────────
function ProgressBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-[#aaa]">
        <span>{label}</span>
        <span className="font-bold text-gray-900 dark:text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── UI Helper: Metadata Item ─────────────────────────────────────────────────
function MetadataItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 text-[12.5px]">
      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#141414] border border-[#e7e5e4] dark:border-[#2a2a2a] flex items-center justify-center text-gray-400 dark:text-[#888] flex-shrink-0 mt-0.5">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-[#666]">
          {label}
        </p>
        <p className="text-gray-900 dark:text-[#f0f0f0] font-medium truncate mt-0.5">
          {value || "Not specified"}
        </p>
      </div>
    </div>
  );
}

// ── Mailto Builders ──────────────────────────────────────────────────────────

function buildInterviewMailto(candidate: CandidateDetail, jd: JD | null): string {
  const to = candidate.email || "";
  const jobTitle = jd?.title || "the open position";
  const company = jd?.company || "our organization";

  const subject = `Interview Invitation — ${jobTitle} at ${company}`;

  const body = `Dear ${candidate.name},

Congratulations! We are pleased to inform you that after reviewing your application for the position of ${jobTitle} at ${company}, we would like to invite you for an interview.

Your profile stood out among the applicants, and we are excited to learn more about your experience and skills.

Interview Details:

Position: ${jobTitle}
Date: [Please suggest your availability]
Time: [To be confirmed]
Mode: [Virtual / In-Person]

Please reply to this email with your available time slots for the upcoming week, and we will confirm the schedule at the earliest.

If you have any questions or need to reschedule, please do not hesitate to reach out.

We look forward to speaking with you!

Best regards,
Hiring Team
${company}`;

  return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildOfferMailto(candidate: CandidateDetail, match: MatchRecord, jd: JD | null): string {
  const to = candidate.email || "";
  const jobTitle = jd?.title || "the open position";
  const company = jd?.company || "our organization";

  const subject = `Offer Letter — ${jobTitle} at ${company}`;

  const body = `Dear ${candidate.name},

Congratulations!

We are thrilled to inform you that after a thorough evaluation process, you have been selected for the position of ${jobTitle} at ${company}.

Offer Details:

Position: ${jobTitle}
Joining Date: [To be discussed]
Compensation: [To be discussed]

Please find the detailed offer letter attached. We kindly request you to review the terms and confirm your acceptance by [deadline date].

Should you have any questions regarding the offer, compensation, benefits, or any other aspect of the role, please do not hesitate to reach out. We are happy to discuss.

We are excited to have you join our team and look forward to the incredible contributions you will make!

Warm regards,
Hiring Team
${company}`;

  return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
