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
    <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[min(90vw,56rem)]">
      <div className="bg-white/30 backdrop-blur-xl rounded-full shadow-md px-4 py-2 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-gray-800"
        >
          <span className="text-[#3e7f6b]">Summit</span>Stats
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm font-medium">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={item.onClick}
              className="px-4 py-1.5 rounded-full text-gray-800 hover:bg-white/60 hover:shadow-sm transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="md:hidden text-gray-700 p-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden mt-2 bg-white/40 backdrop-blur-xl rounded-2xl shadow-md flex flex-col p-2 text-sm font-medium">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="px-4 py-2 rounded-lg text-gray-800 hover:bg-white/60 transition-colors"
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
