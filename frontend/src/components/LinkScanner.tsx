"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LinkScanner({ onResult }: { onResult: (r: any) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!url.trim()) return;
    setLoading(true);
    onResult(null);

    try {
      const res = await fetch(`${API}/api/links/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      onResult(data);
    } catch {
      alert("Scan failed — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2B2930] rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔗</span>
        <div>
          <h3 className="font-semibold text-[#E6E1E5]">URL Safety Scanner</h3>
          <p className="text-[#938F99] text-xs">Check any link for phishing, scams & typosquatting</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="Paste a suspicious URL here..."
          className="flex-1 bg-[#1C1B1F] border border-[#938F99]/20 rounded-xl px-4 py-3 text-sm
            text-[#E6E1E5] placeholder-[#938F99]/50 focus:outline-none focus:border-[#D0BCFF]/50
            transition"
        />
        <button
          onClick={handleScan}
          disabled={loading || !url.trim()}
          className="bg-[#4F378B] hover:bg-[#6750A4] disabled:opacity-40 text-[#D0BCFF]
            font-semibold px-6 py-3 rounded-xl transition-all text-sm whitespace-nowrap"
        >
          {loading ? "Scanning..." : "Scan URL"}
        </button>
      </div>
    </div>
  );
}
