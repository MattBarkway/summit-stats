"use client";

import { AlertTriangle, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDisconnect, useSignOut } from "@/hooks/useSignOut";

export default function SettingsPage() {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();
  const signOut = useSignOut();
  const disconnect = useDisconnect();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/");
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  const handleSignOut = async () => {
    await signOut.mutateAsync();
    router.push("/");
  };

  const handleDisconnect = async () => {
    if (typed !== "DELETE") return;
    setSubmitting(true);
    setError(null);
    try {
      await disconnect.mutateAsync();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 fade-up">
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-8 space-y-8">
        <header>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Settings
          </h1>
          <p className="mt-2 text-slate-400">
            Signed in as{" "}
            <span className="text-slate-200 font-medium">
              {user.firstname ?? `Athlete ${user.id ?? ""}`}
            </span>
          </p>
        </header>

        <section className="rounded-xl ring-1 ring-white/10 bg-white/5 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <LogOut
              className="text-slate-300 shrink-0 mt-0.5"
              size={20}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-bold text-slate-100">Sign out</h2>
              <p className="mt-1 text-sm text-slate-400">
                Clears this browser session. Your data, groups, and Strava
                connection stay intact — sign back in any time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="cursor-pointer rounded-lg ring-1 ring-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </button>
        </section>

        <section className="rounded-xl ring-1 ring-red-400/30 bg-red-500/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-red-400 shrink-0 mt-0.5"
              size={22}
              aria-hidden="true"
            />
            <div>
              <h2 className="text-lg font-bold text-red-200">
                Disconnect Strava
              </h2>
              <p className="mt-1 text-sm text-red-100/80">
                Permanently revokes our access to your Strava account and
                deletes <strong>all your data</strong> from SummitStats:
                activities, points, badges, group memberships, and any groups
                you own (other members lose access).
              </p>
              <p className="mt-2 text-sm text-red-100/80">
                This action cannot be undone. Required by the Strava API
                agreement — see{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-red-50"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg bg-red-500/20 ring-1 ring-red-400/50 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/30 transition-colors"
            >
              Disconnect Strava…
            </button>
          ) : (
            <div className="space-y-3 rounded-lg ring-1 ring-red-400/30 bg-red-950/20 p-4">
              <p className="text-sm text-red-100">
                Type <code className="font-mono font-bold">DELETE</code> to
                confirm:
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={submitting}
                className="w-full rounded-md bg-slate-950/50 ring-1 ring-red-400/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-red-400"
                placeholder="DELETE"
              />
              {error && (
                <p className="text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={typed !== "DELETE" || submitting}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Disconnecting…" : "Disconnect & delete data"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setTyped("");
                    setError(null);
                  }}
                  disabled={submitting}
                  className="rounded-lg ring-1 ring-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
