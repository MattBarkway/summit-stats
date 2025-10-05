import React from "react";

export default function Footer() {
  return (
    <footer className="mt-auto text-gray-600 text-sm py-4 flex justify-center space-x-2">
      <span>
        Built by{" "}
        <a
          href="https://mattbarkway.dev"
          className="underline hover:text-gray-800"
        >
          Matt
        </a>
      </span>
      <span>|</span>
      <a href="/about" className="underline hover:text-gray-800">
        About
      </a>
      <span>|</span>
      <a
        href="https://github.com/MattBarkway/strava-analyser"
        className="underline hover:text-gray-800"
      >
        GitHub
      </a>
    </footer>
  );
}
