"use client";
import { useState } from "react";
import MediaAnalyzer from "@/components/MediaAnalyzer";
import LinkScanner from "@/components/LinkScanner";
import ForensicReport from "@/components/ForensicReport";
import LinkReport from "@/components/LinkReport";
import ThreatFeed from "@/components/ThreatFeed";

type Tab = "media" | "links" | "threats";

export default function Home() {
  const [tab, setTab] = useState<Tab>("media");
  const [mediaResult, setMediaResult] = useState<any>(null);
  const [linkResult, setLinkResult] = useState<any>(null);

  return (
    <main className="min-h-screen bg-gradient-animated text-[#E6E1E5]">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <span className="text-4xl">🛡️</span>
            <div className="absolute -inset-2 bg-[#D0BCFF]/10 rounded-full blur-xl" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#D0BCFF] to-[#EFB8C8] bg-clip-text text-transparent">
              DeepfakeShield
            </h1>
            <p className="text-[#938F99] text-xs tracking-widest uppercase">Zero-Trust Detection Suite</p>
          </div>
        </div>
        <p className="text-[#CAC4D0] text-sm mt-3">
          Verify media authenticity, scan links for scams & track threats — 100% private.
        </p>
      </div>

      {/* Tab switcher — glassmorphism */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <div className="flex gap-2 glass rounded-2xl p-1.5">
          <TabButton active={tab === "media"} onClick={() => setTab("media")} icon="🔍" label="Verify Media" />
          <TabButton active={tab === "links"} onClick={() => setTab("links")} icon="🔗" label="Link Shield" />
          <TabButton active={tab === "threats"} onClick={() => setTab("threats")} icon="🚨" label="Threat Feed" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        {tab === "media" && (
          <>
            <MediaAnalyzer onResult={setMediaResult} />
            {mediaResult && <ForensicReport result={mediaResult} />}
          </>
        )}
        {tab === "links" && (
          <>
            <LinkScanner onResult={setLinkResult} />
            {linkResult && <LinkReport result={linkResult} />}
          </>
        )}
        {tab === "threats" && <ThreatFeed />}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-[#938F99] text-xs">
        <p>DeepfakeShield v2.0 • Zero-Trust • No Data Stored</p>
        <p className="mt-1">
          <a href="https://github.com/VMaroon95/DeepfakeShield-Web" className="hover:text-[#D0BCFF] transition">
            github.com/VMaroon95/DeepfakeShield-Web
          </a>
        </p>
      </footer>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: string; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
        ${active
          ? "glass-accent text-[#D0BCFF] shadow-lg glow-purple"
          : "text-[#CAC4D0] hover:bg-white/5"
        }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
