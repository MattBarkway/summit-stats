import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ReactNode } from "react";
import { ClientProvider } from "@/components/ClientProvider";
import NavbarWrapper from "@/components/NavbarWrapper";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aerie",
  description: "Analyse your strava activities!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-800 h-full flex flex-col`}
      >
        <ClientProvider>
          <NavbarWrapper />
          <main className="pt-16 min-h-[calc(100vh-4rem)]">{children}</main>
        </ClientProvider>
        <Footer />
      </body>
    </html>
  );
}
