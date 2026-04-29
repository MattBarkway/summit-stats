"use client";
import { ChevronRight } from "lucide-react";
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
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20">
      <section className="text-center fade-up">
        <p className="inline-block rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-slate-300 mb-6">
          Group · Compete · Win
        </p>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-100">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-amber-300 bg-clip-text text-transparent">
            Summit
          </span>
          Stats
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
          Group challenges, leaderboards, and bragging rights — pulled live from
          your Strava activities.
        </p>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleConnect}
            className="group inline-flex items-center gap-2 rounded-xl bg-orange-400 px-7 py-4 text-base font-bold text-slate-950 shadow-lg shadow-orange-500/30 hover:bg-orange-500 hover:shadow-orange-500/50 transition-all"
          >
            Connect with Strava
            <ChevronRight
              size={18}
              strokeWidth={2.5}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </section>

      <section className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cycle", value: "monthly", suffix: "" },
          { label: "Sports", value: "10+", suffix: "" },
          { label: "Friction", value: "0", suffix: "" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-md p-6 text-center"
          >
            <p className="text-xs uppercase tracking-widest text-slate-500">
              {stat.label}
            </p>
            <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-slate-100">
              {stat.value}
              <span className="text-orange-400">{stat.suffix}</span>
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
