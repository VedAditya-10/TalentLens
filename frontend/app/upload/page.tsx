"use client";

import { useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getJDs, uploadResume, matchCandidate } from "@/lib/api";
import { JD, UploadFileItem } from "@/lib/types";
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];

function statusLabel(status: UploadFileItem["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "extracting":
      return "Extracting...";
    case "matching":
      return "Matching...";
    case "done":
      return "Done";
    case "error":
      return "Failed";
  }
}

function statusColor(status: UploadFileItem["status"]): string {
  switch (status) {
    case "done":
      return "#22c55e";
    case "error":
      return "#ef4444";
    case "extracting":
    case "matching":
      return "#f97316";
    default:
      return "#9ca3af";
  }
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [jds, setJDs] = useState<JD[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr && curr.message === message ? null : curr));
    }, 5000);
  };

  useEffect(() => {
    getJDs().then(setJDs).catch(console.error);
  }, []);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles: UploadFileItem[] = [];
    const invalid: string[] = [];

    Array.from(newFiles).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (ALLOWED.includes(ext)) {
        validFiles.push({ file, status: "pending" });
      } else {
        invalid.push(file.name);
      }
    });

    if (invalid.length > 0) {
      alert(
        `Invalid file type(s): ${invalid.join(", ")}\nOnly PDF, DOCX, and images (PNG, JPG, JPEG) are accepted.`,
      );
    }
    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const updateStatus = (
    idx: number,
    status: UploadFileItem["status"],
    extra?: Partial<UploadFileItem>,
  ) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, status, ...extra } : f)),
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      updateStatus(i, "extracting");
      let candidate;
      try {
        candidate = await uploadResume(files[i].file);
        updateStatus(i, selectedJdId ? "matching" : "done", { candidate });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Upload failed";
        updateStatus(i, "error", { error: errMsg });
        showToast(`Failed to upload ${files[i].file.name}: ${errMsg}`);
        continue;
      }

      if (selectedJdId && candidate) {
        try {
          const match = await matchCandidate(candidate.id, selectedJdId);
          updateStatus(i, "done", { match });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Matching failed";
          updateStatus(i, "error", { error: errMsg });
          showToast(`Failed to match ${files[i].file.name}: ${errMsg}`);
        }
      }
    }

    setUploading(false);
  };

  const doneCount = files.filter((f) => f.status === "done").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <header>
            <h1 className="tl-page-title">Upload Resumes</h1>
            <p className="tl-metadata mt-1">
              Drag and drop PDF, DOCX, or image files (PNG, JPG, JPEG). Select a JD to auto-match after
              extraction.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                className={cn(
                  "relative rounded-sm border-2 border-dashed p-4 text-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-[#f97316] bg-orange-500/5"
                    : "border-[#e8e2d4] bg-[#fdfbf7] dark:border-[#2a2a2a] dark:bg-[#111111]",
                )}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                <Upload
                  size={32}
                  className={cn(
                    "mx-auto mb-3",
                    dragOver
                      ? "text-[#f97316]"
                      : "text-gray-400 dark:text-[#555555]",
                  )}
                />
                <p className="text-[13px] font-medium text-gray-900 dark:text-[#f0f0f0]">
                  Drop files here or{" "}
                  <span className="text-[#f97316]">browse</span>
                </p>
                <p className="text-[11px] mt-1 tl-muted">
                  Supported: PDF, DOCX, PNG, JPG, JPEG — Multiple allowed
                </p>
              </div>

              <div className="tl-panel p-4">
                <label className="tl-section-label mb-2 block">
                  Auto-match against JD (optional)
                </label>
                <select
                  value={selectedJdId}
                  onChange={(e) => setSelectedJdId(e.target.value)}
                  className="w-full rounded-sm text-[13px] px-3 py-1.5 outline-none tl-input"
                >
                  <option value="">— No JD (extract only) —</option>
                  {jds.map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title}
                      {jd.company ? ` @ ${jd.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || pendingCount === 0}
                  className="tl-btn-primary flex-1 disabled:opacity-40"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Upload{" "}
                      {pendingCount > 0
                        ? `${pendingCount} file${pendingCount !== 1 ? "s" : ""}`
                        : "Files"}
                    </>
                  )}
                </button>
                {files.length > 0 && (
                  <button
                    onClick={() => setFiles([])}
                    disabled={uploading}
                    className="tl-btn-secondary px-4 disabled:opacity-40"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <h2 className="tl-section-label mb-3">Upload Queue</h2>

              {files.length === 0 ? (
                <div className="rounded-sm border border-dashed border-[#e8e2d4] p-4 text-center bg-[#fdfbf7] text-gray-500 dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#555555]">
                  <FileText
                    size={32}
                    className="mx-auto mb-3 opacity-30 text-[#f97316]"
                  />
                  <p className="text-[13px] font-bold text-black dark:text-white">
                    No files in queue
                  </p>
                  <p className="text-[11px] mt-1 tl-muted">
                    Select job descriptions and drop resume PDFs, DOCXs, or images on the
                    left to start AI matching.
                  </p>
                </div>
              ) : (
                <div className="rounded-sm border border-gray-200 overflow-hidden bg-white dark:border-[#2a2a2a] dark:bg-[#111111]">
                  <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between dark:border-[#2a2a2a]">
                    <span className="tl-section-label">
                      {files.length} file{files.length !== 1 ? "s" : ""} queued
                    </span>
                    {doneCount > 0 && (
                      <span className="text-[11px] text-green-500 dark:text-green-400 font-bold">
                        {doneCount} completed
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                    {files.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-3 flex items-center gap-3 bg-white dark:bg-[#111111]"
                      >
                        <FileText
                          size={16}
                          className="text-gray-400 dark:text-[#555555] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate text-gray-900 dark:text-[#f0f0f0]">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] tl-muted">
                            {(item.file.size / 1024).toFixed(0)} KB
                            {item.candidate && ` · ${item.candidate.name}`}
                            {item.match &&
                              ` · ${Math.round(item.match.match_score)}% match`}
                          </p>
                          {item.error && (
                            <p className="text-[10px] text-red-500 dark:text-red-400">
                              {item.error}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {(item.status === "extracting" ||
                            item.status === "matching") && (
                            <Loader2
                              size={13}
                              className="animate-spin text-[#f97316]"
                            />
                          )}
                          {item.status === "done" && (
                            <CheckCircle
                              size={13}
                              className="text-green-500 dark:text-green-400"
                            />
                          )}
                          {item.status === "error" && (
                            <AlertCircle
                              size={13}
                              className="text-red-500 dark:text-red-400"
                            />
                          )}
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: statusColor(item.status) }}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>

                        {item.status === "pending" && (
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-gray-400 hover:text-red-500 dark:text-[#a1a1aa] dark:hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg animate-slide-up max-w-sm bg-white dark:bg-[#141414] border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          <div className="flex-1 min-w-0 text-[12.5px] font-semibold leading-relaxed">
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </AppLayout>
  );
}
