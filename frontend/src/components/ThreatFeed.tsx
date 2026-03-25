"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Report {
  id: number;
  url: string;
  category: string;
  description: string;
  created_at: string;
}

interface Stats {
  total_reports: number;
  total_blocked: number;
  top_domains: [string, number][];
}

export default function ThreatFeed() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [reportsRes, statsRes] = await Promise.all([
          fetch(`${API}/api/reports/recent`),
          fetch(`${API}/api/reports/stats`),
        ]);
        setReports(await reportsRes.json());
        setStats(await statsRes.json());
      } catch { /* backend offline */ }
      setLoading(false);
    };
    load();
  }, []);

  const categoryColors: Record<string, string> = {
    dangerous: "text-red-300 bg-red-900/20",
    suspicious: "text-orange-300 bg-orange-900/20",
    caution: "text-amber-300 bg-amber-900/20",
    safe: "text-green-300 bg-green-900/20",
  };

  if (loading) {
    return (
      <div className="glass rounded-3xl p-12 text-center">
        <div className="w-8 h-8 border-3 border-[#D0BCFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-[#938F99] text-sm">Loading threat intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📊" label="Total Reports" value={stats?.total_reports || 0} />
        <StatCard icon="🚫" label="Domains Blocked" value={stats?.total_blocked || 0} />
        <StatCard icon="🛡️" label="Active Checks" value={10} />
      </div>

      {/* Top targeted domains */}
      {stats?.top_domains && stats.top_domains.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1 h-4 rounded-full bg-red-400" />
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-[#CAC4D0]">Most Targeted Domains</h3>
          </div>
          <div className="glass rounded-2xl p-4 space-y-2">
            {stats.top_domains.map(([domain, count], i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[#938F99] text-xs w-5">#{i + 1}</span>
                  <span className="text-sm font-mono text-[#E6E1E5]">{domain}</span>
                </div>
                <span className="text-xs font-bold text-red-300 bg-red-900/20 px-2 py-0.5 rounded-lg">
                  {count} reports
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent reports */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-4 rounded-full bg-[#D0BCFF]" />
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-[#CAC4D0]">Recent Reports</h3>
        </div>
        {reports.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <span className="text-4xl block mb-3">🔇</span>
            <span className="text-[#938F99] text-sm">No reports yet — the community database is empty.</span>
            <p className="text-[#938F99] text-xs mt-2">Scan a suspicious link and hit "Report" to contribute!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-[#E6E1E5] truncate max-w-[70%]">{r.url}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${categoryColors[r.category] || "text-gray-300 bg-gray-900/20"}`}>
                    {r.category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[#938F99] text-xs truncate max-w-[70%]">{r.description}</p>
                  <span className="text-[#938F99] text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-[#E6E1E5] mt-1">{value}</p>
      <p className="text-[#938F99] text-xs">{label}</p>
    </div>
  );
}
