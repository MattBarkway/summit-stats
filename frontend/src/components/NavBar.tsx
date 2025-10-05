"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
};

type NavbarProps = {
  items: NavItem[];
};

export default function Navbar({ items }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md fixed w-full z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl text-emerald-600 font-stretch-150%"
        >
          🔍
          <span className={"text-orange-500"}>
          {" "}Summit
        </span>
          Stats
        </Link>
        <div className="hidden md:flex space-x-6 text-gray-700 font-medium">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-orange-500"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          className="md:hidden text-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white shadow-md flex flex-col space-y-2 px-4 py-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-orange-500"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
