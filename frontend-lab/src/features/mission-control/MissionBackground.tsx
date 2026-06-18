/**
 * Atmospheric background layer for the Mission Control hero.
 *
 * Three visual elements, all CSS-driven (GPU-composited, zero JS):
 * 1. Dot grid — subtle repeating pattern
 * 2. Radial glow — centered blue luminance
 * 3. Vignette — dark edges for depth
 *
 * Renders immediately. No entrance animation (Phase 1).
 */
export default function MissionBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base */}
      <div className="absolute inset-0 bg-[#0A0E27]" />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.04) 40%, transparent 70%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(10, 14, 39, 0.6) 100%)",
        }}
      />
    </div>
  );
}
