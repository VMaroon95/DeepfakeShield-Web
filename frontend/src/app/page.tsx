"use client";
import { useState } from "react";
import MediaAnalyzer from "@/components/MediaAnalyzer";
import LinkScanner from "@/components/LinkScanner";
import ForensicReport from "@/components/ForensicReport";
import LinkReport from "@/components/LinkReport";

type Tab = "media" | "links";

export default function Home() {
  const [tab, setTab] = useState<Tab>("media");
  const [mediaResult, setMediaResult] = useState<any>(null);
  const [linkResult, setLinkResult] = useState<any>(null);

  return (
    <main className="min-h-screen bg-[#1C1B1F] text-[#E6E1E5]">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🛡️</span>
          <h1 className="text-3xl font-extrabold tracking-tight">DeepfakeShield</h1>
        </div>
        <p className="text-[#CAC4D0] text-sm">
          Verify media authenticity & scan links for scams — 100% private, no data stored.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <div className="flex gap-2 bg-[#2B2930] rounded-2xl p-1.5">
          <TabButton
            active={tab === "media"}
            onClick={() => setTab("media")}
            icon="🔍"
            label="Deepfake Scanner"
          />
          <TabButton
            active={tab === "links"}
            onClick={() => setTab("links")}
            icon="🔗"
            label="Link Checker"
          />
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
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-[#938F99] text-xs">
        <p>DeepfakeShield • 100% Private • No Data Stored</p>
        <p className="mt-1">
          <a href="https://github.com/VMaroon95/DeepfakeShield" className="hover:text-[#D0BCFF] transition">
            github.com/VMaroon95/DeepfakeShield
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
          ? "bg-[#4F378B] text-[#D0BCFF] shadow-lg"
          : "text-[#CAC4D0] hover:bg-[#36343B]"
        }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
