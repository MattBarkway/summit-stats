import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Oops! Page not found.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
      >
        Go Home
      </Link>
    </main>
  );
}
