import Link from "next/link";
import PoweredByStrava from "./PoweredByStrava";

export default function Footer() {
  return (
    <footer className="text-slate-400 text-sm py-6 flex flex-col items-center gap-3">
      <PoweredByStrava width={140} />
      <div className="flex justify-center items-center space-x-3 flex-wrap">
        <span>
          Built by{" "}
          <a
            href="https://mattbarkway.dev"
            className="underline underline-offset-2 hover:text-slate-100"
          >
            Matt
          </a>
        </span>
        <span className="text-slate-600">·</span>
        <Link
          href="/about"
          className="underline underline-offset-2 hover:text-slate-100"
        >
          About
        </Link>
        <span className="text-slate-600">·</span>
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-slate-100"
        >
          Privacy
        </Link>
        <span className="text-slate-600">·</span>
        <a
          href="https://github.com/MattBarkway/strava-analyser"
          className="underline underline-offset-2 hover:text-slate-100"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
