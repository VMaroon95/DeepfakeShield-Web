"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LinkReport({ result }: { result: any }) {
  if (!result) return null;

  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const verdictColors: Record<string, { ring: string; bg: string; text: string; glow: string }> = {
    safe: { ring: "border-green-400", bg: "bg-green-950/40", text: "text-green-300", glow: "glow-green" },
    caution: { ring: "border-amber-400", bg: "bg-amber-950/40", text: "text-amber-300", glow: "" },
    suspicious: { ring: "border-orange-400", bg: "bg-orange-950/40", text: "text-orange-300", glow: "" },
    dangerous: { ring: "border-red-400", bg: "bg-red-950/40", text: "text-red-300", glow: "glow-red" },
  };
  const vc = verdictColors[result.verdict] || verdictColors.caution;

  const severityColors: Record<string, string> = {
    critical: "text-red-300 bg-red-900/20",
    high: "text-orange-300 bg-orange-900/20",
    medium: "text-amber-300 bg-amber-900/20",
    low: "text-blue-300 bg-blue-900/20",
  };

  const handleReport = async () => {
    setReporting(true);
    try {
      await fetch(`${API}/api/reports/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: result.url, category: result.verdict, description: `Auto-reported: ${result.verdict_label}` }),
      });
      setReported(true);
    } catch { /* silent */ }
    setReporting(false);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Verdict */}
      <div className="flex flex-col items-center">
        <div className={`w-44 h-44 rounded-full border-[6px] ${vc.ring} ${vc.bg} flex flex-col items-center justify-center shadow-2xl ${vc.glow} backdrop-blur-xl`}>
          <span className="text-[#938F99] text-[10px] font-semibold tracking-widest uppercase">Risk Score</span>
          <span className={`text-5xl font-extrabold ${vc.text}`}>{result.risk_score}</span>
          <span className="text-[#938F99] text-xs">out of 100</span>
        </div>
        <div className={`mt-4 px-5 py-2 rounded-full border ${vc.ring} ${vc.bg} backdrop-blur-sm`}>
          <span className={`text-sm font-bold ${vc.text}`}>{result.verdict_label}</span>
        </div>
      </div>

      {/* Domain info */}
      <div className="glass rounded-2xl p-5">
        {[
          ["🌐", "Domain", result.domain],
          ["📅", "Domain Age", result.domain_age_days != null ? `${result.domain_age_days} days` : "Unknown"],
          ["🔒", "SSL", result.ssl_info?.issuer || "Not checked"],
          ["🔍", "Checks Run", result.checks_run],
          ["📊", "Community Reports", result.community_reports || 0],
          ["⏱️", "Processing", `${result.processing_ms}ms`],
        ].map(([icon, label, val], i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-[#CAC4D0] flex items-center gap-2"><span>{icon}</span>{label}</span>
            <span className="text-sm font-medium font-mono text-[#E6E1E5]">{val}</span>
          </div>
        ))}
      </div>

      {/* Findings */}
      {result.findings?.length > 0 ? (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-4 rounded-full bg-red-400" />
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-[#CAC4D0]">
              Findings ({result.findings.length})
            </h3>
          </div>
          <div className="space-y-3">
            {result.findings.map((f: any, i: number) => (
              <div key={i} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#E6E1E5] capitalize">{f.type.replace(/_/g, " ")}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${severityColors[f.severity] || ""}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="text-[#938F99] text-xs">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 text-center border border-green-400/10 glow-green">
          <span className="text-green-300 text-sm font-medium">✅ No suspicious indicators detected</span>
        </div>
      )}

      {/* Report button */}
      {result.risk_score > 30 && (
        <button
          onClick={handleReport}
          disabled={reporting || reported}
          className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${
            reported
              ? "glass text-green-300"
              : "bg-red-900/30 border border-red-400/20 text-red-300 hover:bg-red-900/50"
          }`}
        >
          {reported ? "✅ Reported to Community Database" : reporting ? "Submitting..." : "🚨 Report this Scam"}
        </button>
      )}
    </div>
  );
}
