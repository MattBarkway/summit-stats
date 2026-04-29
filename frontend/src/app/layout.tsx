import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";
import { ClientProvider } from "@/components/ClientProvider";
import Footer from "@/components/Footer";
import NavbarWrapper from "@/components/NavbarWrapper";

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
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-800 h-full flex flex-col relative`}
      >
        <div className="fixed inset-0 -z-10 flex flex-col">
          <div className="h-screen w-full bg-linear-to-br from-[#d3dbd2] via-[#ab97af] to-[#87768e]" />
          <div className="flex-1 w-full bg-[#87768e]" />
        </div>
        <ClientProvider>
          <NavbarWrapper />
          <main className="pt-16 min-h-[calc(100vh-4rem)] flex-1 relative">
            {children}
          </main>
        </ClientProvider>
        <Footer />
      </body>
    </html>
  );
}
