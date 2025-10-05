import Link from "next/link";
import Image from "next/image";
export default function AboutPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="mb-6">
        <Image
          src="/favicon-large.png"
          alt="SummitStats logo"
          width={100}
          height={100}
        />
      </div>
      <h1 className="text-4xl font-bold mb-4">About SummitStats</h1>
      <p className="text-lg mb-8 text-center max-w-xl">
        <br />
        This is a tech demo to visualize your Strava data. Both the web service
        project and the Strava API wrapper are available on GitHub:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <a
          href="https://github.com/MattBarkway/strava-analyser"
          target="_blank"
          rel="noopener noreferrer"
          className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition text-center"
        >
          <h2 className="text-xl font-semibold mb-2">This Project</h2>
          <p className="text-orange-500 underline">View on GitHub</p>
        </a>

        <a
          href="https://github.com/MattBarkway/strava-wrapper"
          target="_blank"
          rel="noopener noreferrer"
          className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition text-center"
        >
          <h2 className="text-xl font-semibold mb-2">API Wrapper</h2>
          <p className="text-orange-500 underline">View on GitHub</p>
        </a>
      </div>

      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
      >
        Back to Home
      </Link>
    </main>
  );
}
