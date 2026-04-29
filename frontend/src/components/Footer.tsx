export default function Footer() {
  return (
    <footer className="text-gray-700 text-sm py-4 flex justify-center space-x-2">
      <span>
        Built by{" "}
        <a
          href="https://mattbarkway.dev"
          className="underline hover:text-gray-900"
        >
          Matt
        </a>
      </span>
      <span>|</span>
      <a href="/about" className="underline hover:text-gray-900">
        About
      </a>
      <span>|</span>
      <a
        href="https://github.com/MattBarkway/strava-analyser"
        className="underline hover:text-gray-900"
      >
        GitHub
      </a>
    </footer>
  );
}
