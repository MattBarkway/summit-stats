export default function Footer() {
  return (
    <footer className="text-slate-400 text-sm py-6 flex justify-center space-x-3">
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
      <a
        href="/about"
        className="underline underline-offset-2 hover:text-slate-100"
      >
        About
      </a>
      <span className="text-slate-600">·</span>
      <a
        href="https://github.com/MattBarkway/strava-analyser"
        className="underline underline-offset-2 hover:text-slate-100"
      >
        GitHub
      </a>
    </footer>
  );
}
