"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/groups");
    }
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  const handleConnect = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/strava`;
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/40 backdrop-blur-xl shadow-xl p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Image
            src="/favicon-large.png"
            alt="SummitStats logo"
            width={88}
            height={88}
          />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">
          <span className="text-[#3e7f6b]">Summit</span>Stats
        </h1>
        <p className="mt-3 text-gray-700">
          Group challenges and leaderboards from your Strava activities.
        </p>
        <button
          type="button"
          onClick={handleConnect}
          className="mt-6 w-full py-3 rounded-lg bg-[#3e7f6b]/80 text-white font-medium hover:bg-[#358d73] transition-colors duration-200"
        >
          Connect with Strava
        </button>
      </div>
    </main>
  );
}
