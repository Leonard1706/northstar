import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { AgentPanelProvider } from "@/lib/agent-context";
import { AgentPanel } from "@/components/agent/agent-panel";
import "./globals.css";

// Satoshi - Clean, geometric, modern sans-serif for body text
const satoshi = localFont({
  src: [
    {
      path: "./fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

// Instrument Serif - Elegant display font for headings
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Northstar — Personal Goal Alignment",
  description: "Navigate toward your guiding vision with clarity and purpose",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scrollbar-thin">
      <body
        className={`${satoshi.variable} ${instrumentSerif.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AgentPanelProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-[72px] lg:ml-[260px] min-h-screen bg-background paper-texture transition-all duration-300">
              <div className="relative z-10">
                {children}
              </div>
            </main>
          </div>
          <AgentPanel />
        </AgentPanelProvider>
      </body>
    </html>
  );
}
