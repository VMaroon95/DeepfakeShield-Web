"use client";

export default function ForensicReport({ result }: { result: any }) {
  if (!result) return null;

  const verdictColors: Record<string, { ring: string; bg: string; text: string }> = {
    likely_real: { ring: "border-green-400", bg: "bg-green-950", text: "text-green-300" },
    low_confidence: { ring: "border-blue-400", bg: "bg-blue-950", text: "text-blue-300" },
    suspicious: { ring: "border-amber-400", bg: "bg-amber-950", text: "text-amber-300" },
    likely_synthetic: { ring: "border-red-400", bg: "bg-red-950", text: "text-red-300" },
  };
  const vc = verdictColors[result.verdict] || verdictColors.low_confidence;

  const statusColors: Record<string, string> = {
    pass: "text-green-300 bg-green-900/30",
    warn: "text-amber-300 bg-amber-900/30",
    fail: "text-red-300 bg-red-900/30",
    info: "text-blue-300 bg-blue-900/30",
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Verdict gauge */}
      <div className="flex flex-col items-center">
        <div className={`w-44 h-44 rounded-full border-[6px] ${vc.ring} ${vc.bg} flex flex-col items-center justify-center shadow-2xl`}>
          <span className="text-[#938F99] text-[10px] font-semibold tracking-widest uppercase">Risk Score</span>
          <span className={`text-5xl font-extrabold ${vc.text}`}>{result.score}</span>
          <span className="text-[#938F99] text-xs">out of 100</span>
        </div>
        <div className={`mt-4 px-5 py-2 rounded-full border ${vc.ring} ${vc.bg}`}>
          <span className={`text-sm font-bold ${vc.text}`}>{result.verdict_label}</span>
        </div>
        {result.is_simulated && (
          <div className="mt-3 px-4 py-1.5 rounded-full bg-[#4F378B]/30 border border-[#D0BCFF]/20">
            <span className="text-[#D0BCFF] text-xs font-medium">🎲 Simulation Mode — no real model loaded</span>
          </div>
        )}
      </div>

      {/* Forensic markers */}
      <Section title="Forensic Evidence" accent="bg-[#D0BCFF]">
        {result.markers?.map((m: any) => (
          <div key={m.id} className="bg-[#2B2930] rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#E6E1E5]">{m.label}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${statusColors[m.status] || ""}`}>
                {m.status === "pass" ? "Clear" : m.status === "warn" ? "Review" : "Alert"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#49454F] overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  m.status === "pass" ? "bg-green-400" : m.status === "warn" ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${m.score}%` }}
              />
            </div>
            <p className="text-[#938F99] text-xs">{m.detail}</p>
          </div>
        ))}
      </Section>

      {/* Integrity checks */}
      <Section title="Digital Integrity" accent="bg-[#CCC2DC]">
        <div className="bg-[#2B2930] rounded-2xl p-5 space-y-3">
          {result.integrity?.map((check: any, i: number) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                check.status === "pass" ? "bg-green-400" : check.status === "warn" ? "bg-amber-400" : check.status === "fail" ? "bg-red-400" : "bg-blue-400"
              }`} />
              <div className="flex-1">
                <span className="text-sm font-medium text-[#E6E1E5]">{check.label}</span>
                <p className="text-[#938F99] text-xs">{check.detail}</p>
              </div>
              <span className={`text-xs font-bold ${
                check.status === "pass" ? "text-green-400" : check.status === "warn" ? "text-amber-400" : check.status === "fail" ? "text-red-400" : "text-blue-400"
              }`}>
                {check.status === "pass" ? "✓" : check.status === "warn" ? "!" : check.status === "fail" ? "✗" : "i"}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Video-specific analysis */}
      {result.is_video && (
        <Section title="Multi-Frame Analysis" accent="bg-[#CCC2DC]">
          <div className="bg-[#2B2930] rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-xs text-[#938F99]">Average Frame Score</span>
                <div className="text-xl font-bold text-[#E6E1E5]">{result.avg_frame_score?.toFixed(1) || 'N/A'}</div>
              </div>
              <div>
                <span className="text-xs text-[#938F99]">Consistency Score</span>
                <div className="text-xl font-bold text-[#E6E1E5]">{result.consistency_score || 'N/A'}</div>
              </div>
            </div>
            
            {result.frame_results && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-[#CAC4D0]">Frame-by-Frame Analysis</span>
                <div className="space-y-2">
                  {result.frame_results.map((frame: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#36343B] rounded-lg">
                      <span className="text-sm text-[#CAC4D0]">Frame {frame.frame_number}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-2 rounded-full bg-[#49454F] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              frame.score <= 30 ? "bg-green-400" : 
                              frame.score <= 50 ? "bg-blue-400" :
                              frame.score <= 75 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${frame.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-[#E6E1E5] w-8">{frame.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* GAN Analysis (if available) */}
      {result.gan_analysis && (
        <Section title="GAN Fingerprinting" accent="bg-[#F2B8B5]">
          <div className="bg-[#2B2930] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#E6E1E5]">Frequency Domain Analysis</span>
              <span className="text-xl font-bold text-[#E6E1E5]">{result.gan_analysis.gan_score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-[#49454F] overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${
                  result.gan_analysis.gan_score <= 20 ? "bg-green-400" : 
                  result.gan_analysis.gan_score <= 40 ? "bg-blue-400" :
                  result.gan_analysis.gan_score <= 65 ? "bg-amber-400" : "bg-red-400"
                }`}
                style={{ width: `${result.gan_analysis.gan_score}%` }}
              />
            </div>
            <p className="text-[#938F99] text-sm">{result.gan_analysis.verdict_label}</p>
            {result.gan_analysis.indicators && result.gan_analysis.indicators.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.gan_analysis.indicators.map((indicator: string, i: number) => (
                  <div key={i} className="text-xs text-[#CAC4D0]">• {indicator}</div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Metadata */}
      <Section title="File Metadata" accent="bg-[#EFB8C8]">
        <div className="bg-[#2B2930] rounded-2xl p-5">
          {result.is_video ? [
            ["🎬", "Type", "Video"],
            ["📊", "Frames Analyzed", result.metadata?.frames_analyzed],
            ["📁", "File Size", `${result.file_size_mb} MB`],
            ["🧬", "Model", result.model_version],
            ["⏱️", "Processing", `${result.processing_ms}ms`],
          ] : [
            ["📐", "Dimensions", result.metadata ? `${result.metadata?.width}×${result.metadata?.height}` : 'N/A'],
            ["📄", "Format", result.metadata?.format],
            ["💾", "File Size", result.metadata ? `${result.metadata?.size_kb} KB` : `${result.file_size_mb} MB`],
            ["🧬", "Model", result.model_version],
            ["⏱️", "Processing", `${result.processing_ms}ms`],
          ].map(([icon, label, val], i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-[#CAC4D0] flex items-center gap-2"><span>{icon}</span>{label}</span>
              <span className="text-sm font-medium text-[#E6E1E5]">{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-1 h-4 rounded-full ${accent}`} />
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-[#CAC4D0]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
