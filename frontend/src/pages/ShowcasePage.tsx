import { Link } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";

export default function ShowcasePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-40 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-medium tracking-wide text-blue-600 uppercase">
            Showcase
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Built with HydraAtlas
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Explore projects and research powered by the HydraAtlas platform.
            Case studies and examples are coming soon.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Open Studio
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
