"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import Navbar, { type NavItem } from "@/components/NavBar";
import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";

const loggedOutNavItems: NavItem[] = [{ label: "About", href: "/about" }];

export default function NavbarWrapper() {
  const { data: user, isLoading } = useAuth();
  const signOut = useSignOut();
  const router = useRouter();

  if (isLoading) return null;

  if (!user) {
    return <Navbar items={loggedOutNavItems} />;
  }

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut.mutateAsync();
    router.push("/");
  };

  const items: NavItem[] = [
    { label: "Groups", href: "/groups" },
    { label: "About", href: "/about" },
    { label: "Sign Out", href: "#", onClick: handleSignOut },
  ];

  return <Navbar items={items} />;
}
