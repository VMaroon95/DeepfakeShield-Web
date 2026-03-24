"use client";
import { useState, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MediaAnalyzer({ onResult }: { onResult: (r: any) => void }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>("image");

  const handleFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      alert("Please upload an image (JPEG, PNG, WebP, GIF) or video (MP4, MOV, WebM)");
      return;
    }
    
    setFileType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    onResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/media/analyze`, { method: "POST", body: form });
      const data = await res.json();
      onResult(data);
    } catch (err) {
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
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
          ${dragging
            ? "border-[#D0BCFF] bg-[#4F378B]/20"
            : "border-[#938F99]/30 hover:border-[#938F99]/60 bg-[#2B2930]"
          }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        {preview ? (
          <div className="relative">
            {fileType === "image" ? (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-2xl object-cover" />
            ) : (
              <video 
                src={preview} 
                controls 
                className="max-h-64 mx-auto rounded-2xl"
                style={{ maxWidth: "100%" }}
              />
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-[#D0BCFF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#D0BCFF] text-sm font-medium">
                    {fileType === "video" ? "Extracting frames..." : "Analyzing..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-[#E6E1E5] font-semibold mb-1">
              Drop media here or click to browse
            </p>
            <p className="text-[#938F99] text-sm">
              Images: JPEG, PNG, WebP, GIF (Max 20MB)<br/>
              Videos: MP4, MOV, WebM (Max 100MB)
            </p>
          </>
        )}
      </div>
      <input
        id="file-input"
        type="file"
        accept="image/*,video/*"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}
