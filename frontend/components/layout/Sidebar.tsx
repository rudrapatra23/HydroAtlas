"use client";

import { useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { MOCK_VARIABLES, buildMockTimeseries } from "@/lib/mock/datasetMock";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { cn } from "@/lib/utils/cn";

/**
 * Bloomberg Terminal style analytics sidebar.
 *
 * Visual contract:
 *   - Pure black background, 1-px amber-tinted borders, sharp corners.
 *   - Monospace typography throughout, ALL CAPS section headers.
 *   - Tabular figures, right-aligned numerics.
 *   - Read-only mocks: no API calls, no async, no network.
 *
 * The sidebar reads UI-store state and renders a deterministic
 * mock series based on the currently selected map point.
 */
export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const selectedVariable = useUIStore((s) => s.selectedVariable);
  const setVariable = useUIStore((s) => s.setVariable);
  const selectedPoint = useUIStore((s) => s.selectedPoint);

  // Deterministic seed derived from the selected point so the
  // chart and stats update when the user clicks a new location.
  const series = useMemo(() => {
    const seed = selectedPoint
      ? Math.abs(Math.round(selectedPoint.lat * 100 + selectedPoint.lon * 100))
      : 7;
    return buildMockTimeseries(seed);
  }, [selectedPoint]);

  const variable =
    MOCK_VARIABLES.find((v) => v.id === selectedVariable) ?? MOCK_VARIABLES[0]!;

  const stats = useMemo(() => {
    if (series.length === 0) {
      return { current: 0, max: 0, min: 0, mean: 0 };
    }
    const values = series.map((p) => p.v);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      current: values[values.length - 1] ?? 0,
      max: Math.max(...values),
      min: Math.min(...values),
      mean: sum / values.length,
    };
  }, [series]);

  // Time string evaluated at render; cheap and updates each second
  // implicitly when the parent re-renders on store changes.
  const now = useMemo(
    () => new Date().toISOString().slice(11, 19) + " UTC",
    [series],
  );

  return (
    <aside
      className={cn(
        "fixed right-3 bottom-3 top-20 z-20 flex flex-col rounded-sm border border-amber-500/30 bg-black font-mono text-amber-500 transition-transform duration-300 ease-out",
        "w-[min(94vw,420px)] md:w-[420px]",
        sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
      )}
      aria-label="Analytics"
      aria-hidden={!sidebarOpen}
    >
      {/* ---------- Terminal header ---------- */}
      <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/[0.04] px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500">
          HYDROATLAS // ANALYTICS TERMINAL
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] tabular-nums text-amber-500/70">{now}</span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="text-amber-500/70 transition hover:text-amber-500"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path
                d="M10 4l-4 4 4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2 text-[11px]">
        {/* ---------- Variable selector (terminal tabs) ---------- */}
        <section className="border border-amber-500/20">
          <div className="border-b border-amber-500/20 bg-amber-500/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
            ACTIVE QUERY
          </div>
          <div className="flex">
            {MOCK_VARIABLES.map((v) => {
              const active = v.id === selectedVariable;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariable(v.id)}
                  className={cn(
                    "flex-1 border-r border-amber-500/20 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition last:border-r-0",
                    active
                      ? "bg-amber-500 text-black"
                      : "text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- Coordinate readout ---------- */}
        <section className="border border-amber-500/20">
          <div className="border-b border-amber-500/20 bg-amber-500/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
            COORDINATES
          </div>
          <div className="px-2 py-1.5 tabular-nums">
            {selectedPoint ? (
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <span className="text-amber-500/50">LAT </span>
                  <span className="text-amber-500">
                    {Math.abs(selectedPoint.lat).toFixed(4)}°
                    {selectedPoint.lat >= 0 ? "N" : "S"}
                  </span>
                </div>
                <div>
                  <span className="text-amber-500/50">LON </span>
                  <span className="text-amber-500">
                    {Math.abs(selectedPoint.lon).toFixed(4)}°
                    {selectedPoint.lon >= 0 ? "E" : "W"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-amber-500/50">
                AWAITING MAP CLICK<span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Stat panel ---------- */}
        <section className="border border-amber-500/20">
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
            <span>{variable.label}</span>
            <span className="text-amber-500/60">{variable.unit}</span>
          </div>
          <div className="grid grid-cols-4 px-2 pt-1.5 text-[9px] uppercase tracking-wider text-amber-500/50">
            <div>Current</div>
            <div className="text-right">24h Max</div>
            <div className="text-right">24h Min</div>
            <div className="text-right">24h Avg</div>
          </div>
          <div className="grid grid-cols-4 border-t border-amber-500/20 px-2 py-1.5 text-[12px] tabular-nums">
            <div className="font-bold text-white">{stats.current.toFixed(2)}</div>
            <div className="text-right text-amber-500">{stats.max.toFixed(2)}</div>
            <div className="text-right text-amber-500">{stats.min.toFixed(2)}</div>
            <div className="text-right text-amber-500">{stats.mean.toFixed(2)}</div>
          </div>
        </section>

        {/* ---------- Chart ---------- */}
        <section className="border border-amber-500/20">
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/[0.04] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
            <span>Series · Last 48h</span>
            <span className="text-amber-500/60">{variable.label.toUpperCase()}</span>
          </div>
          <div className="flex items-baseline justify-between bg-black px-2 pt-1 text-[10px]">
            <span className="uppercase tracking-wider text-amber-500/50">Last</span>
            <span className="font-bold tabular-nums text-amber-500">
              {stats.current.toFixed(2)} {variable.unit}
            </span>
          </div>
          <div className="bg-black p-1">
            <TimeSeriesChart points={series} unit={variable.unit} />
          </div>
        </section>

        {/* ---------- Footer ---------- */}
        <div className="flex items-center justify-between border border-amber-500/20 px-2 py-1 text-[9px] uppercase tracking-wider text-amber-500/50">
          <span className="tabular-nums">Updated {now}</span>
          <span>● Mock data · not for production</span>
        </div>
      </div>
    </aside>
  );
}
