"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { createJD } from "@/lib/api";
import { Plus, X } from "lucide-react";

const inputClassName =
  "w-full rounded-sm text-[13px] px-3 py-2 outline-none tl-input focus:border-[#f97316]";

export default function CreateJDPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((sk) => sk !== s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError("Title and Description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const jd = await createJD({
        title,
        company,
        description,
        required_skills: skills,
        experience_required: experience,
      });
      router.push(`/jd/${jd.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create JD");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <header>
            <h1 className="tl-page-title">Create Job Description</h1>
            <p className="tl-metadata mt-1">
              Define the role — TalentLens will match candidates against it
              automatically.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="tl-section-label mb-1.5 block">
                Job Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="tl-section-label mb-1.5 block">
                Company (optional)
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="tl-section-label mb-1.5 block">
                Job Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe responsibilities, qualifications, and expectations..."
                rows={8}
                className={`${inputClassName} resize-y leading-relaxed`}
              />
            </div>

            <div>
              <label className="tl-section-label mb-1.5 block">
                Required Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className={`${inputClassName} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="tl-btn-primary whitespace-nowrap"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm font-medium bg-orange-500/10 border border-orange-500/25 text-[#f97316]"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="tl-section-label mb-1.5 block">
                Experience Required (optional)
              </label>
              <input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 3-5 years, 2+ years"
                className={inputClassName}
              />
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-[12px] border border-red-200 bg-red-50 px-3 py-1.5 rounded-sm dark:border-red-800/30 dark:bg-red-900/10">
                {error}
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="tl-btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Job Description"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="tl-btn-secondary px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
