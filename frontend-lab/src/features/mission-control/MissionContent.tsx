/**
 * Hero content block — headline, subtitle, CTA buttons, tech bar.
 *
 * Typography hierarchy:
 *   h1: 56–80px, font-extrabold, tight tracking
 *   p:  18–20px, font-normal, relaxed leading
 *   CTA: 14px, font-semibold
 *   Tech bar: 12px, font-semibold, uppercase tracking
 *
 * Phase 1: fully static. Animations added in Phase 3.
 */
export default function MissionContent() {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-6">
      {/* Status badge */}
      <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-slate-400">
          Powered by ERA5-Land &amp; Copernicus CDS
        </span>
      </div>

      {/* Headline */}
      <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
        Climate Intelligence
        <br />
        <span className="text-blue-400">for Hydrology</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
        Analyze rainfall, soil moisture, and surface runoff across India with
        satellite-grade precision. One platform, zero infrastructure.
      </p>

      {/* CTA group */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <a
          href="/studio"
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(37,99,235,0.3)]"
        >
          Launch Studio
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <a
          href="#docs"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white hover:border-white/[0.15]"
        >
          Read Documentation
        </a>
      </div>

      {/* Technology bar */}
      <div className="mt-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {["ERA5-Land", "Copernicus", "MapLibre", "FastAPI", "PostgreSQL", "Amazon S3"].map(
          (tech) => (
            <span
              key={tech}
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition-colors hover:text-slate-400"
            >
              {tech}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
