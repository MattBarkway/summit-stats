import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-8">
        <div className="mb-6 flex justify-center">
          <Image
            src="/favicon-large.png"
            alt="SummitStats logo"
            width={88}
            height={88}
          />
        </div>
        <h1 className="text-3xl font-semibold text-center text-gray-900">
          About <span className="text-[#3e7f6b]">Summit</span>Stats
        </h1>
        <p className="mt-4 text-gray-700 text-center max-w-xl mx-auto">
          A tech demo showing off Strava group challenges and leaderboards. Both
          this app and the Strava API wrapper are open source:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <a
            href="https://github.com/MattBarkway/strava-analyser"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-white/40 backdrop-blur-sm p-5 hover:bg-white/60 transition-colors text-center"
          >
            <h2 className="font-semibold text-gray-900 mb-1">This Project</h2>
            <p className="text-sm text-[#3e7f6b]">View on GitHub →</p>
          </a>

          <a
            href="https://github.com/MattBarkway/strava-wrapper"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl bg-white/40 backdrop-blur-sm p-5 hover:bg-white/60 transition-colors text-center"
          >
            <h2 className="font-semibold text-gray-900 mb-1">API Wrapper</h2>
            <p className="text-sm text-[#3e7f6b]">View on GitHub →</p>
          </a>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block rounded-lg bg-[#3e7f6b]/80 px-6 py-3 text-white font-medium hover:bg-[#358d73] transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
