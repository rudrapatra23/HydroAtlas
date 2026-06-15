import { HydraLogo } from "@/components/ui/HydraLogo";

/**
 * Top navigation bar. Floats over the map with a glass background.
 * Layout:
 *   - Left: logo + product name
 *   - Center: primary navigation (hidden below md breakpoint)
 *   - Right: status pill + sign-in CTA
 */
export function Navbar() {
  return (
    <header className="glass fixed inset-x-3 top-3 z-30 flex h-14 items-center justify-between rounded-2xl px-4">
      <div className="flex items-center gap-3">
        <HydraLogo className="h-7 w-7" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-zinc-50">
            HydraAtlas
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Cloud-Native Hydrology
          </span>
        </div>
      </div>

      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {[
          { label: "Explore", active: true },
          { label: "Datasets" },
          { label: "Analytics" },
          { label: "Docs" },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            className={
              "rounded-md px-3 py-1.5 text-sm transition-colors " +
              (item.active
                ? "bg-white/5 text-zinc-50"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100")
            }
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-emerald-400" />
          Mock data
        </span>
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink-950 transition hover:bg-accent/90"
        >
          Sign in
        </button>
      </div>
    </header>
  );
}
