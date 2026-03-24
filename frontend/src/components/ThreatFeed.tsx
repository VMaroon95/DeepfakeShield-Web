"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ThreatFeed() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadThreatData();
  }, []);

  const loadThreatData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load stats and recent reports in parallel
      const [statsResponse, reportsResponse] = await Promise.all([
        fetch(`${API}/api/reports/stats`),
        fetch(`${API}/api/reports/recent?limit=15`)
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      }

    } catch (err) {
      setError('Failed to load threat intelligence data');
      console.error('Threat feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#D0BCFF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#CAC4D0] text-sm">Loading threat intelligence...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-400/20 rounded-3xl p-8 text-center">
        <div className="text-red-400 text-4xl mb-3">⚠️</div>
        <p className="text-red-300 font-medium mb-2">Threat Feed Unavailable</p>
        <p className="text-red-400/80 text-sm mb-4">{error}</p>
        <button
          onClick={loadThreatData}
          className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded-xl text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Section title="Threat Intelligence Overview" accent="bg-[#F2B8B5]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon="📊"
            label="Total Reports"
            value={stats?.total_reports?.toLocaleString() || '0'}
            color="text-blue-400"
          />
          <StatCard
            icon="🚫"
            label="Blocked Domains"
            value={stats?.total_domains?.toLocaleString() || '0'}
            color="text-red-400"
          />
          <StatCard
            icon="🤖"
            label="Auto-Blocked"
            value={stats?.auto_blocked_domains?.toLocaleString() || '0'}
            color="text-orange-400"
          />
          <StatCard
            icon="📈"
            label="Last 24h"
            value={stats?.recent_reports_24h?.toLocaleString() || '0'}
            color="text-purple-400"
          />
        </div>
      </Section>

      {/* Top Reported Domains */}
      {stats?.top_domains && stats.top_domains.length > 0 && (
        <Section title="Most Reported Domains" accent="bg-[#CCC2DC]">
          <div className="bg-[#2B2930] rounded-2xl p-5">
            <div className="space-y-3">
              {stats.top_domains.slice(0, 10).map((domain: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-[#CAC4D0] bg-[#36343B] px-2 py-1 rounded">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-mono text-[#E6E1E5]">{domain.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-[#49454F] overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min((domain.count / stats.top_domains[0].count) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-red-400 w-8 text-right">{domain.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Scam Categories */}
      {stats?.categories && stats.categories.length > 0 && (
        <Section title="Threat Categories" accent="bg-[#D0BCFF]">
          <div className="bg-[#2B2930] rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.categories.map((cat: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#36343B] rounded-lg">
                  <span className="text-sm text-[#CAC4D0] capitalize">
                    {getCategoryIcon(cat.category)} {cat.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium text-[#E6E1E5]">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Recent Reports */}
      <Section title="Recent Scam Reports" accent="bg-[#EFB8C8]">
        {reports.length === 0 ? (
          <div className="bg-[#2B2930] rounded-2xl p-8 text-center">
            <div className="text-[#938F99] text-3xl mb-2">🕊️</div>
            <p className="text-[#938F99] text-sm">No recent reports — all clear!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report, i) => (
              <ReportCard key={i} report={report} />
            ))}
          </div>
        )}
      </Section>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadThreatData}
          className="px-6 py-3 bg-[#4F378B] hover:bg-[#6750A4] text-[#D0BCFF] rounded-2xl font-medium transition-colors"
        >
          🔄 Refresh Feed
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#2B2930] rounded-2xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-[#938F99] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ReportCard({ report }: { report: any }) {
  const categoryIcons: Record<string, string> = {
    phishing: '🎣',
    fake_store: '🛍️',
    crypto_scam: '₿',
    romance_scam: '💔',
    tech_support: '🖥️',
    investment_fraud: '📈',
    malware: '🦠',
    spam: '📧',
    other: '❓'
  };

  return (
    <div className="bg-[#2B2930] border border-white/5 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{categoryIcons[report.category] || '❓'}</span>
            <span className="text-sm font-medium text-[#E6E1E5] capitalize">
              {report.category.replace('_', ' ')}
            </span>
            {report.verified && (
              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>
          
          <p className="text-sm font-mono text-[#CAC4D0] mb-1 truncate" title={report.url}>
            {report.domain}
          </p>
          
          {report.description && (
            <p className="text-xs text-[#938F99] line-clamp-2">
              {report.description}
            </p>
          )}
        </div>
        
        <div className="text-xs text-[#938F99] whitespace-nowrap">
          {report.time_ago}
        </div>
      </div>
    </div>
  );
}

function Section({ title, accent, children }: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-1 h-4 rounded-full ${accent}`} />
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-[#CAC4D0]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    phishing: '🎣',
    fake_store: '🛍️',
    crypto_scam: '₿',
    romance_scam: '💔',
    tech_support: '🖥️',
    investment_fraud: '📈',
    malware: '🦠',
    spam: '📧',
    other: '❓'
  };
  return icons[category] || '❓';
}