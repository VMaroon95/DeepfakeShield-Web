"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LinkReport({ result }: { result: any }) {
  if (!result) return null;

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

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
        
        {result.domain_age_days !== null && (
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#CAC4D0]">📅 Domain Age</span>
            <span className="text-sm font-medium text-[#E6E1E5]">
              {result.domain_age_days} day{result.domain_age_days !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {result.ssl_info && (
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#CAC4D0]">🔒 SSL Status</span>
            <span className={`text-sm font-medium ${result.ssl_info.valid ? 'text-green-400' : 'text-red-400'}`}>
              {result.ssl_info.valid ? '✅ Valid' : '❌ Invalid'}
            </span>
          </div>
        )}
        
        {result.scam_db_result?.found && (
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#CAC4D0]">📊 User Reports</span>
            <span className="text-sm font-medium text-red-400">
              {result.scam_db_result.report_count} report{result.scam_db_result.report_count !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center py-2 border-b border-white/5">
          <span className="text-sm text-[#CAC4D0]">🔍 Checks Run</span>
          <span className="text-sm font-medium text-[#E6E1E5]">{result.checks_run}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-[#CAC4D0]">⏱️ Processing</span>
          <span className="text-sm font-medium text-[#E6E1E5]">{result.processing_ms}ms</span>
        </div>
      </div>

      {/* Report Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setReportModalOpen(true)}
          disabled={reportSubmitted}
          className={`px-6 py-3 rounded-2xl font-semibold text-sm transition-all ${
            reportSubmitted
              ? 'bg-green-900/30 text-green-400 cursor-not-allowed'
              : 'bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300'
          }`}
        >
          {reportSubmitted ? '✅ Report Submitted' : '🚨 Report this Scam'}
        </button>
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

      {/* Report Modal */}
      {reportModalOpen && (
        <ReportModal
          url={result.url}
          onClose={() => setReportModalOpen(false)}
          onSubmit={() => {
            setReportSubmitted(true);
            setReportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ReportModal({ url, onClose, onSubmit }: {
  url: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'phishing', label: '🎣 Phishing' },
    { id: 'fake_store', label: '🛍️ Fake Store' },
    { id: 'crypto_scam', label: '₿ Crypto Scam' },
    { id: 'romance_scam', label: '💔 Romance Scam' },
    { id: 'tech_support', label: '🖥️ Tech Support' },
    { id: 'investment_fraud', label: '📈 Investment Fraud' },
    { id: 'malware', label: '🦠 Malware' },
    { id: 'spam', label: '📧 Spam' },
    { id: 'other', label: '❓ Other' }
  ];

  const handleSubmit = async () => {
    if (!category) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/api/reports/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          category,
          description: description.trim() || undefined
        })
      });
      
      if (response.ok) {
        onSubmit();
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (err) {
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1B1F] border border-[#938F99]/20 rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#E6E1E5]">Report Scam</h3>
          <button
            onClick={onClose}
            className="text-[#938F99] hover:text-[#E6E1E5] transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-[#CAC4D0] mb-2">URL:</p>
          <p className="text-sm font-mono bg-[#2B2930] p-2 rounded-lg text-[#E6E1E5] break-all">
            {url}
          </p>
        </div>

        <div className="mb-4">
          <label className="text-sm text-[#CAC4D0] mb-2 block">Scam Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#2B2930] border border-[#938F99]/20 rounded-xl p-3 text-[#E6E1E5] focus:border-[#D0BCFF] focus:outline-none"
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="text-sm text-[#CAC4D0] mb-2 block">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details about this scam..."
            className="w-full bg-[#2B2930] border border-[#938F99]/20 rounded-xl p-3 text-[#E6E1E5] focus:border-[#D0BCFF] focus:outline-none resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-2xl bg-[#2B2930] text-[#CAC4D0] hover:bg-[#36343B] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!category || submitting}
            className="flex-1 px-4 py-3 rounded-2xl bg-[#4F378B] text-[#D0BCFF] hover:bg-[#6750A4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
