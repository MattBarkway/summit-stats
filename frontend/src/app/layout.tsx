import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";
import { ClientProvider } from "@/components/ClientProvider";
import Footer from "@/components/Footer";
import NavbarWrapper from "@/components/NavbarWrapper";
import TopoBackground from "@/components/TopoBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SummitStats",
  description: "Group challenges and leaderboards for your Strava activities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-100 min-h-screen flex flex-col relative`}
      >
        {/* Layered backdrop: solid bg, aurora glow, topo lines.
            pointer-events:none + will-change keeps it cheap on resize. */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden bg-[#0b1020] pointer-events-none"
        >
          <div
            className="absolute -inset-[20%] aurora-drift"
            style={{
              willChange: "transform",
              background:
                "radial-gradient(900px circle at 15% 20%, rgba(251,146,60,0.18), transparent 55%)," +
                "radial-gradient(800px circle at 85% 85%, rgba(34,211,238,0.14), transparent 55%)," +
                "radial-gradient(700px circle at 50% 50%, rgba(139,92,246,0.10), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.45]">
            <TopoBackground />
          </div>
        </div>

        <ClientProvider>
          <NavbarWrapper />
          <main className="pt-20 flex-1 relative">{children}</main>
        </ClientProvider>
        <Footer />
      </body>
    </html>
  );
}
