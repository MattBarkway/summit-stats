"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";

export type NavItem = {
  label: string;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
};

type NavbarProps = {
  items: NavItem[];
};

export default function Navbar({ items }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,60rem)]">
      <div className="bg-white/5 backdrop-blur-xl ring-1 ring-white/10 rounded-full shadow-lg shadow-black/30 px-4 py-2 flex items-center justify-between">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          <span className="text-orange-400">Summit</span>
          <span className="text-slate-100">Stats</span>
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={item.onClick}
              className="px-4 py-1.5 rounded-full text-slate-200 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="md:hidden text-slate-200 p-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden mt-2 bg-white/5 backdrop-blur-xl ring-1 ring-white/10 rounded-2xl shadow-lg shadow-black/30 flex flex-col p-2 text-sm font-medium">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="px-4 py-2 rounded-lg text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
              onClick={(e) => {
                setIsOpen(false);
                item.onClick?.(e);
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
