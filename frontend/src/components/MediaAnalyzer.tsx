"use client";
import { useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

export default function MediaAnalyzer({ onResult }: { onResult: (r: any) => void }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const isVid = file.type.startsWith("video/");
    const isImg = file.type.startsWith("image/");
    if (!isVid && !isImg) {
      alert("Upload an image or video (JPEG, PNG, WebP, GIF, MP4, MOV, WebM)");
      return;
    }
    setIsVideo(isVid);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    onResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/media/analyze`, { method: "POST", body: form });
      const data = await res.json();
      onResult(data);
    } catch {
      alert("Analysis failed — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
          ${dragging
            ? "border-[#D0BCFF] glass-accent glow-purple"
            : "border-[#938F99]/20 hover:border-[#938F99]/40 glass"
          }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        {preview ? (
          <div className="relative">
            {isVideo ? (
              <video src={preview} className="max-h-64 mx-auto rounded-2xl" controls={false} muted />
            ) : (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-2xl object-cover" />
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 border-3 border-[#D0BCFF] border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 border-3 border-[#D0BCFF]/30 rounded-full animate-pulse-ring" />
                  </div>
                  <span className="text-[#D0BCFF] text-sm font-medium">
                    {isVideo ? "Extracting keyframes..." : "Running forensic analysis..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">🔬</div>
            <p className="text-[#E6E1E5] font-semibold mb-1">
              Drop media here or click to browse
            </p>
            <p className="text-[#938F99] text-sm">
              Images (JPEG, PNG, WebP, GIF) or Videos (MP4, MOV, WebM) • Max 100MB
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <span className="text-xs px-3 py-1 rounded-full glass text-[#CAC4D0]">🖼️ Images</span>
              <span className="text-xs px-3 py-1 rounded-full glass text-[#CAC4D0]">🎬 Videos</span>
            </div>
          </>
        )}
      </div>
      <input id="file-input" type="file" accept={ACCEPTED} onChange={onPick} className="hidden" />
    </div>
  );
}
