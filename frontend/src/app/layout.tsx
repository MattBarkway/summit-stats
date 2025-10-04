import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ReactNode } from "react";
import { ClientProvider } from "@/components/ClientProvider";
import Navbar, { NavItem } from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strava Analyser",
  description: "Analyse your strava activities!",
};

const navItems: NavItem[] = [
  // TODO
  //  - only render this for logged in/authenticated users
  //  - Create Achievements page
  //  - Create stats page
  //  - Create static About page
  { label: "🏠 Dashboard", href: "/dashboard" },
  { label: "🏅 Achievements", href: "/achievements" },
  { label: "🤓 Stats", href: "/stats" },
  { label: "🚪 Sign Out", href: "/sign-out" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-800`}
      >
        <Navbar items={navItems} />
        <main className="pt-16">
          <ClientProvider>{children}</ClientProvider>
        </main>
        <footer className="text-gray-600 text-sm py-4 mt-8 flex justify-center space-x-2">
          <span>
            Built by{" "}
            <a
              href="https://mattbarkway.dev"
              className="underline hover:text-gray-800"
            >
              Matt
            </a>
          </span>
          <span>|</span>
          <a href="/about" className="underline hover:text-gray-800">
            About
          </a>
          <span>|</span>
          <a
            href="https://github.com/MattBarkway/strava-analyser"
            className="underline hover:text-gray-800"
          >
            GitHub
          </a>
        </footer>
      </body>
    </html>
  );
}
