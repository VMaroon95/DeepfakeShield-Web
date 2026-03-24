import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DeepfakeShield — Verify Media & Scan Links",
  description: "Detect deepfakes and scan links for scams. 100% private, no data stored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#1C1B1F] antialiased`}>{children}</body>
    </html>
  );
}
