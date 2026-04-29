"use client";
import { Crown, Mountain, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleConnect}
            aria-label="Connect with Strava"
            className="cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-md"
          >
            <Image
              src="/strava/btn_connect_orange.svg"
              alt="Connect with Strava"
              width={237}
              height={48}
              priority
            />
          </button>
          <Link
            href="/privacy"
            className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            Privacy policy
          </Link>
        </div>
      </section>

      <section className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            Icon: Trophy,
            title: "Leaderboards",
            body: "Weekly, monthly, quarterly, or yearly cycles. Points reset; rivalries don't.",
          },
          {
            Icon: Mountain,
            title: "Segment challenges",
            body: "Pick a segment, set a deadline. Fastest in the window takes the bonus points.",
          },
          {
            Icon: Crown,
            title: "Badges & podiums",
            body: "Cycle Champion. KOM Hunter. Centurion. Earn them, wear them.",
          },
        ].map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-md p-6 text-left"
          >
            <Icon
              size={22}
              strokeWidth={2}
              className="text-orange-400"
              aria-hidden="true"
            />
            <h3 className="mt-3 text-lg font-bold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
