import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 fade-up">
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center text-slate-100">
          About{" "}
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-amber-300 bg-clip-text text-transparent">
            Summit
          </span>
          Stats
        </h1>
        <p className="mt-6 text-slate-300 text-center max-w-xl mx-auto">
          A tech demo showing off Strava group challenges and leaderboards. Both
          this app and the Strava API wrapper are open source:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <a
            href="https://github.com/MattBarkway/strava-analyser"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 hover:bg-white/10 transition-colors text-center"
          >
            <h2 className="font-bold text-slate-100 mb-1">This Project</h2>
            <p className="text-sm text-orange-300">View on GitHub →</p>
          </a>

          <a
            href="https://github.com/MattBarkway/strava-wrapper"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 hover:bg-white/10 transition-colors text-center"
          >
            <h2 className="font-bold text-slate-100 mb-1">API Wrapper</h2>
            <p className="text-sm text-orange-300">View on GitHub →</p>
          </a>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-orange-400 px-6 py-3 text-slate-950 font-bold hover:bg-orange-500 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
