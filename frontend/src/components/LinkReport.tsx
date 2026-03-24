"use client";

export default function LinkReport({ result }: { result: any }) {
  if (!result) return null;

  const verdictColors: Record<string, { ring: string; bg: string; text: string }> = {
    safe: { ring: "border-green-400", bg: "bg-green-950", text: "text-green-300" },
    caution: { ring: "border-amber-400", bg: "bg-amber-950", text: "text-amber-300" },
    suspicious: { ring: "border-orange-400", bg: "bg-orange-950", text: "text-orange-300" },
    dangerous: { ring: "border-red-400", bg: "bg-red-950", text: "text-red-300" },
  };
  const vc = verdictColors[result.verdict] || verdictColors.caution;

  const severityColors: Record<string, string> = {
    critical: "text-red-300 bg-red-900/30",
    high: "text-orange-300 bg-orange-900/30",
    medium: "text-amber-300 bg-amber-900/30",
    low: "text-blue-300 bg-blue-900/30",
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Verdict */}
      <div className="flex flex-col items-center">
        <div className={`w-44 h-44 rounded-full border-[6px] ${vc.ring} ${vc.bg} flex flex-col items-center justify-center shadow-2xl`}>
          <span className="text-[#938F99] text-[10px] font-semibold tracking-widest uppercase">Risk Score</span>
          <span className={`text-5xl font-extrabold ${vc.text}`}>{result.risk_score}</span>
          <span className="text-[#938F99] text-xs">out of 100</span>
        </div>
        <div className={`mt-4 px-5 py-2 rounded-full border ${vc.ring} ${vc.bg}`}>
          <span className={`text-sm font-bold ${vc.text}`}>{result.verdict_label}</span>
        </div>
      </div>

      {/* Domain info */}
      <div className="bg-[#2B2930] rounded-2xl p-5">
        <div className="flex justify-between items-center py-2 border-b border-white/5">
          <span className="text-sm text-[#CAC4D0]">🌐 Domain</span>
          <span className="text-sm font-mono font-medium text-[#E6E1E5]">{result.domain}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/5">
          <span className="text-sm text-[#CAC4D0]">🔍 Checks Run</span>
          <span className="text-sm font-medium text-[#E6E1E5]">{result.checks_run}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-[#CAC4D0]">⏱️ Processing</span>
          <span className="text-sm font-medium text-[#E6E1E5]">{result.processing_ms}ms</span>
        </div>
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
              <div key={i} className="bg-[#2B2930] rounded-2xl p-4 border border-white/5">
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
        <div className="bg-green-950/30 border border-green-400/20 rounded-2xl p-5 text-center">
          <span className="text-green-300 text-sm font-medium">✅ No suspicious indicators detected</span>
        </div>
      )}
    </div>
  );
}
