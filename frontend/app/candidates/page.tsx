"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCandidates, deleteCandidate } from "@/lib/api";
import { Candidate } from "@/lib/types";
import {
  Search,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { InitialAvatar } from "@/components/ui/InitialAvatar";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCandidates()
      .then((data) => {
        if (!cancelled) setCandidates(data);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete candidate ${name}? This will remove all their profile data and match history.`,
      )
    ) {
      return;
    }
    try {
      await deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete candidate.");
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.branch && c.branch.toLowerCase().includes(q)) ||
      (c.resume_filename && c.resume_filename.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <header className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="tl-page-title">Candidates Directory</h1>
              <p className="tl-metadata mt-1">
                Manage and browse all extracted candidate profiles
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
                  placeholder="Search by name, email, branch..."
                  className="tl-input pl-9 pr-3 py-2 w-[280px] text-[13px]"
                />
              </div>
            </div>
          </header>

          <div className="tl-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#f97316]" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <User size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-[12px] font-bold text-black dark:text-white">
                  {candidates.length === 0
                    ? "No candidates in the database."
                    : "No candidates match your search."}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b border-[#e8e2d4] bg-[#fdfbf7] h-[40px] dark:border-[#2a2a2a] dark:bg-[#111111]">
                    <th className="px-4 tl-section-label">Candidate</th>
                    <th className="px-4 tl-section-label">Contact</th>
                    <th className="px-4 tl-section-label">Branch</th>
                    <th className="px-4 tl-section-label">Gender</th>
                    <th className="px-4 tl-section-label">Resume File</th>
                    <th className="px-4 tl-section-label">Added On</th>
                    <th className="px-4 tl-section-label text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                  {filteredCandidates.map((c) => (
                    <tr
                      key={c.id}
                      className="bg-white hover:bg-gray-50 transition-colors h-[56px] dark:bg-[#111111] dark:hover:bg-[#141414]"
                    >

                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <InitialAvatar name={c.name} size="md" />
                          <p className="text-[14px] font-bold text-black dark:text-white">
                            {c.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 tl-muted">
                        <div className="space-y-0.5">
                          {c.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={10} />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={10} />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {!c.email && !c.phone && <span>—</span>}
                        </div>
                      </td>

                      <td className="px-4 tl-muted">{c.branch || "—"}</td>

                      <td className="px-4 text-[12px]">
                        {c.gender ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-semibold border border-gray-200 bg-gray-50 text-gray-500 dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#555555]">
                            {c.gender}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 tl-muted">
                        <div className="flex items-center gap-1 truncate max-w-[180px]">
                          <FileText
                            size={12}
                            className="text-[#f97316] opacity-60 flex-shrink-0"
                          />
                          <span className="truncate" title={c.resume_filename}>
                            {c.resume_filename}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 tl-muted">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 text-right">
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                          title="Delete candidate profile"
                        >
                          <Trash2 size={12} />
                        </button>
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
