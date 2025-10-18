"use client";
import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || user) return null;
  const handleConnect = () => {
    window.location.href = "http://localhost:8080/auth/strava";
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mb-6">
        <Image
          src="/favicon-large.png"
          alt="SummitStats logo"
          width={100}
          height={100}
        />
      </div>

      <h1 className="text-4xl font-bold mb-6 text-gray-700">
        Welcome to
        <span className={"font-light text-orange-500 font-stretch-150%"}>
          {" "}
          Summit
        </span>
        <span className={"font-light text-emerald-600 font-stretch-150%"}>
          Stats
        </span>
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Connect with Strava to see your personalized activity dashboard.
      </p>
      <button
        onClick={handleConnect}
        className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
      >
        Connect with Strava
      </button>
    </main>
  );
}
