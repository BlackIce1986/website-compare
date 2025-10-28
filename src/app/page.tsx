import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 font-sans dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-16 px-8 text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Website Compare Logo"
            width={120}
            height={24}
            priority
          />
        </div>

        {/* Hero Section */}
        <div className="mb-12 max-w-2xl">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Website Compare
          </h1>
          <p className="text-xl leading-relaxed text-gray-600 dark:text-gray-300">
            Compare websites side by side, analyze performance, and make informed decisions. 
            Get detailed insights and visual comparisons to help you choose the best solution.
          </p>
        </div>

        {/* Features */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <div className="mb-4 text-3xl">🔍</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Visual Comparison
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Side-by-side screenshots and visual analysis
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <div className="mb-4 text-3xl">⚡</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Performance Metrics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Load times, responsiveness, and optimization scores
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <div className="mb-4 text-3xl">📊</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Detailed Reports
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Comprehensive analysis and actionable insights
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-8 text-white font-medium transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="flex h-12 w-full items-center justify-center rounded-full border-2 border-blue-600 px-8 text-blue-600 font-medium transition-colors hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-gray-900 sm:w-auto"
          >
            Get Started
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Start comparing websites today and make better decisions</p>
        </div>
      </main>
    </div>
  );
}
