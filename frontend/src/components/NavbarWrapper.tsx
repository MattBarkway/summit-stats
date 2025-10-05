"use client";

import React from "react";
import Navbar, { NavItem } from "@/components/NavBar";
import { useAuth } from "@/hooks/useAuth";

const loggedInNavItems: NavItem[] = [
  { label: "🏠 Dashboard", href: "/dashboard" },
  { label: "🏅 Achievements", href: "/achievements" },
  { label: "🤓 Stats", href: "/stats" },
  { label: "🚪 Sign Out", href: "/sign-out" },
];

const loggedOutNavItems: NavItem[] = [{ label: "📚 About", href: "/about" }];

export default function NavbarWrapper() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) return null;

  const navItems = user ? loggedInNavItems : loggedOutNavItems;

  return <Navbar items={navItems} />;
}
