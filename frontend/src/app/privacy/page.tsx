import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · SummitStats",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-12 fade-up">
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-xl shadow-black/20 p-8 space-y-6 text-slate-300">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center text-slate-100">
          Privacy <span className="text-orange-400">Policy</span>
        </h1>
        <p className="text-sm text-slate-500 text-center">
          Last updated: 29 April 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Who we are</h2>
          <p>
            SummitStats is a hobby project that lets small groups compete on
            Strava activities. It uses the Strava API under their developer
            terms; it is not affiliated with or endorsed by Strava.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">What we store</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>OAuth tokens</strong> — used to fetch your activities from
              Strava on your behalf. Stored encrypted at rest.
            </li>
            <li>
              <strong>Profile</strong> — Strava athlete ID, first name, last
              name, profile picture URL.
            </li>
            <li>
              <strong>Recent activities</strong> — name, sport, distance,
              elevation, time, start date, and segment efforts. Cached for at
              most seven days, after which raw activity data is purged from our
              database.
            </li>
            <li>
              <strong>Derived data</strong> — points you&rsquo;ve earned in
              groups, badge awards, segment-challenge progress, and a
              lightweight summary of each scored activity (its name, distance,
              etc.). Retained until you disconnect.
            </li>
            <li>
              <strong>Group state</strong> — groups you&rsquo;ve joined or
              created, point rules, segment challenges.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Why we store it</h2>
          <p>
            Solely to render group leaderboards, feeds, and challenges that you
            and other group members can see. We don&rsquo;t use your data for
            advertising, profiling, or training AI/ML models, and we never
            combine it with data from third-party fitness platforms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Who sees it</h2>
          <p>
            Members of groups you join can see your name, profile picture, and
            activity-level point earnings within those groups. We don&rsquo;t
            share your data with anyone else, don&rsquo;t sell it, and
            don&rsquo;t expose it publicly.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Your rights</h2>
          <p>
            Under UK/EU GDPR you have the right to access, correct, or delete
            your data, and to withdraw consent at any time. The fastest route is
            the <strong>Disconnect Strava</strong> button under{" "}
            <Link
              href="/settings"
              className="text-orange-400 underline underline-offset-4"
            >
              Settings
            </Link>{" "}
            — it permanently deletes all your data from our database, revokes
            our access to your Strava account, and deletes any groups you own
            (other members lose access to those groups). Disconnect cascades
            within seconds.
          </p>
          <p>
            You can also revoke our access from{" "}
            <a
              href="https://www.strava.com/settings/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 underline underline-offset-4"
            >
              Strava&rsquo;s connected-apps page
            </a>
            . Strava notifies us, and we delete your data within 24 hours.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Data retention</h2>
          <p>
            Raw Strava data (activity records, segment efforts) is cached for a
            maximum of seven days, in line with the Strava API agreement. We
            keep the points-and-badges ledger derived from that data for as long
            as you remain signed up. Disconnecting deletes both.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Cookies</h2>
          <p>
            One first-party session cookie keeps you logged in. No third-party
            tracking, no analytics cookies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-100">Contact</h2>
          <p>
            Questions or data requests:{" "}
            <a
              href="mailto:contact@mattbarkway.dev"
              className="text-orange-400 underline underline-offset-4"
            >
              contact@mattbarkway.dev
            </a>
            .
          </p>
        </section>

        <div className="pt-4 text-center">
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
