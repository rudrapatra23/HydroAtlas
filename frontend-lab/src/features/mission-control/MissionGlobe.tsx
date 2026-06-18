/**
 * Globe visualization — placeholder for Phase 2.
 * Will use react-globe.gl, completely isolated and reusable.
 */
export default function MissionGlobe() {
  return (
    <div className="flex items-center justify-center" aria-label="Globe visualization">
      {/* Globe visual placeholder — sized for future react-globe.gl */}
      <div className="relative h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] lg:h-[420px] lg:w-[420px]">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
        {/* Middle ring */}
        <div className="absolute inset-6 rounded-full border border-white/[0.04]" />
        {/* Inner ring */}
        <div className="absolute inset-12 rounded-full border border-white/[0.03]" />
        {/* Crosshair horizontal */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.04]" />
        {/* Crosshair vertical */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.04]" />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500/40" />
      </div>
    </div>
  );
}
