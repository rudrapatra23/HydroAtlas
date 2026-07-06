import { useEffect, useRef, useState } from "react";
import {
  useAppStore,
  Variable,
  monthStringToYearMonth,
} from "../../stores/useAppStore";
import { motion } from "framer-motion";
import { getDistrictRangeStatistics } from "../../api/boundaries";

interface KpiConfig {
  icon: string;
  label: string;
  variable: Variable;
  unit: string;
  color: string;
}

const KPI_CONFIGS: KpiConfig[] = [
  { icon: "rainy", label: "Precipitation", variable: "precipitation", unit: "m", color: "#2563EB" },
  { icon: "water_drop", label: "Soil Moisture", variable: "soil_moisture", unit: "m³/m³", color: "#16A34A" },
  { icon: "waves", label: "Surface Runoff", variable: "surface_runoff", unit: "m", color: "#EA580C" },
];

function IconContainer({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-md"
      style={{ backgroundColor: color ? `${color}1A` : "#F1F5F9" }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2.5 mb-2">
        <IconContainer color={color}>
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 20, color }}
          >
            {icon}
          </span>
        </IconContainer>
        <span className="text-xs font-medium text-slate-600">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-xl font-semibold tabular-nums tracking-tight"
          style={{ color }}
        >
          {value.toFixed(6)}
        </span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Small, non-blocking overlay rendered while a new query is in flight.
 * The previous committed KPI data stays visible underneath so the user
 * never sees a destructive blank during district / month / year / range
 * transitions. The badge is truthful: it only signals that a refresh is
 * in progress, not a fake percentage or fabricated backend stage.
 */
function RefreshingBadge({ label = "Updating…" }: { label?: string }) {
  return (
    <div
      className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-white/40 border-t-white"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

function SelectedLocation() {
  const selectedStateId = useAppStore((state) => state.selectedStateId);
  const selectedDistrictId = useAppStore((state) => state.selectedDistrictId);
  const states = useAppStore((state) => state.states);
  const districts = useAppStore((state) => state.districts);
  const rightSidebarOpen = useAppStore((state) => state.rightSidebarOpen);
  const setRightSidebarOpen = useAppStore((state) => state.setRightSidebarOpen);
  const startMonth = useAppStore((state) => state.startMonth);
  const endMonth = useAppStore((state) => state.endMonth);
  const [stats, setStats] = useState<Record<Variable, { mean: number; min: number; max: number }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [noDatasetForPeriod, setNoDatasetForPeriod] = useState(false);
  const [monthsProcessed, setMonthsProcessed] = useState(0);
  // Tracks whether at least one fetch for the current selection has
  // ever settled. Used to distinguish "no data yet attempted" from a
  // genuine empty / 404 result, so we never render a misleading
  // "No data available" message before the first request resolves.
  const [hasAttempted, setHasAttempted] = useState(false);

  // Monotonically-increasing request id. Every effect run captures the
  // current value at the top and bumps the ref; every async continuation
  // compares its captured id against the ref's current value. A mismatch
  // means a newer effect run has started (district changed, state
  // changed, range changed) and the captured run is stale. This replaces
  // the previous `let cancelled = false` pattern with one that also
  // survives the early-return paths (H1.c) and the D1->D2->D3 case
  // where a stale response must not commit or affect loading.
  const requestIdRef = useRef(0);

  const selectedState = states.find((s) => s.id === selectedStateId);
  const selectedDistrict = districts.find((d) => d.id === selectedDistrictId);

  // Every change to the selected Start Month or End Month — or to the
  // selected district — must immediately re-run the analysis request.
  //
  // Correctness contract (see H1.c + D1->D2->D3 in
  // .kimchi/docs/race-diagnosis.md):
  //   1. Every effect run gets a fresh requestId by bumping requestIdRef.
  //   2. Every early-return path resets ALL display state — stats,
  //      loading, noDatasetForPeriod, monthsProcessed, hasAttempted —
  //      so a deselect / empty range / inverted range cannot leave the
  //      panel stuck.
  //   3. Every async continuation checks `isCurrent()` BEFORE mutating
  //      any state, so a stale response can never overwrite a fresher
  //      one or incorrectly clear loading.
  //   4. The AbortController is best-effort: it cancels the network
  //      request as soon as a new effect run starts. `isCurrent()` is
  //      the correctness backstop for the case where the abort arrives
  //      after the response body has already been parsed.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === requestId;

    if (!selectedDistrictId) {
      setStats(null);
      setNoDatasetForPeriod(false);
      setMonthsProcessed(0);
      setLoading(false);
      setHasAttempted(false);
      return;
    }

    const districtId = selectedDistrictId;
    const start = monthStringToYearMonth(startMonth);
    const end = monthStringToYearMonth(endMonth);
    if (!start || !end) {
      setStats(null);
      setNoDatasetForPeriod(false);
      setMonthsProcessed(0);
      setLoading(false);
      setHasAttempted(false);
      return;
    }
    if (start.year * 12 + start.month > end.year * 12 + end.month) {
      setStats(null);
      setNoDatasetForPeriod(false);
      setMonthsProcessed(0);
      setLoading(false);
      setHasAttempted(false);
      return;
    }

    setLoading(true);
    setNoDatasetForPeriod(false);
    setHasAttempted(false);

    const ac = new AbortController();

    async function fetchAllStats() {
      try {
        const [precipStats, soilStats, runoffStats] = await Promise.all([
          getDistrictRangeStatistics(
            districtId,
            {
              start_year: start!.year,
              start_month: start!.month,
              end_year: end!.year,
              end_month: end!.month,
              variable: "precipitation",
            },
            ac.signal,
          ),
          getDistrictRangeStatistics(
            districtId,
            {
              start_year: start!.year,
              start_month: start!.month,
              end_year: end!.year,
              end_month: end!.month,
              variable: "soil_moisture",
            },
            ac.signal,
          ),
          getDistrictRangeStatistics(
            districtId,
            {
              start_year: start!.year,
              start_month: start!.month,
              end_year: end!.year,
              end_month: end!.month,
              variable: "surface_runoff",
            },
            ac.signal,
          ),
        ]);
        if (!isCurrent()) return;
        // Belt-and-braces: even if this run is still current, the user
        // may have navigated to a different district in the time it took
        // for the POSTs to settle. Defend against late commits.
        if (useAppStore.getState().selectedDistrictId !== districtId) return;
        setStats({
          precipitation: { mean: precipStats.mean, min: precipStats.min, max: precipStats.max },
          soil_moisture: { mean: soilStats.mean, min: soilStats.min, max: soilStats.max },
          surface_runoff: { mean: runoffStats.mean, min: runoffStats.min, max: runoffStats.max },
        });
        setMonthsProcessed(precipStats.months_processed);
        setHasAttempted(true);
      } catch (error) {
        if (!isCurrent()) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (useAppStore.getState().selectedDistrictId !== districtId) return;
        const message = error instanceof Error ? error.message : String(error);
        if (/404/.test(message)) {
          setStats(null);
          setMonthsProcessed(0);
          setNoDatasetForPeriod(true);
        } else {
          console.error("Failed to fetch statistics:", error);
          setStats(null);
          setMonthsProcessed(0);
        }
        setHasAttempted(true);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    }

    fetchAllStats();

    return () => {
      // Bump the requestId so any awaited response from this run is
      // immediately classified as stale, even before the new run's body
      // executes. Combined with the increment at the top of the next
      // run this is equivalent to (and faster than) ac.abort().
      ++requestIdRef.current;
      ac.abort();
    };
  }, [selectedDistrictId, startMonth, endMonth]);

  const periodLabel = (() => {
    const start = monthStringToYearMonth(startMonth);
    const end = monthStringToYearMonth(endMonth);
    if (!start || !end) return "";
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const startLabel = `${monthNames[start.month - 1]} ${start.year}`;
    const endLabel = `${monthNames[end.month - 1]} ${end.year}`;
    return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
  })();

  if (!rightSidebarOpen) {
    return (
      <motion.button
        initial={false}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => setRightSidebarOpen(true)}
        className="mt-0 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
        aria-label="Open selected region"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
          info
        </span>
      </motion.button>
    );
  }

  if (!selectedStateId || !selectedDistrictId) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="mt-0 w-full rounded-md border border-slate-200 bg-white px-4 py-4 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">
          Selected Region
        </p>
        <button
          type="button"
          onClick={() => setRightSidebarOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
          aria-label="Close selected region"
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            close
          </span>
        </button>
      </div>

      <div className="flex gap-3 rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 mb-3">
        <div className="flex-1">
          <span className="text-xs text-slate-500 block">State</span>
          <p className="text-sm font-medium text-slate-800">
            {selectedState?.name || "-"}
          </p>
        </div>
        <div className="w-px bg-slate-200" />
        <div className="flex-1">
          <span className="text-xs text-slate-500 block">District</span>
          <p className="text-sm font-medium text-slate-800">
            {selectedDistrict?.name || "-"}
          </p>
        </div>
      </div>

      {stats && !noDatasetForPeriod ? (
        <div className="relative">
          <div className="grid grid-cols-1 gap-2 mb-3">
            {KPI_CONFIGS.map((kpi) => (
              <KpiCard
                key={kpi.variable}
                icon={kpi.icon}
                label={kpi.label}
                value={stats[kpi.variable].mean}
                unit={kpi.unit}
                color={kpi.color}
              />
            ))}
          </div>
          {loading && <RefreshingBadge label="Processing new selection…" />}
        </div>
      ) : loading || !hasAttempted ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
        </div>
      ) : noDatasetForPeriod ? (
        <div className="flex items-center justify-center py-8 text-sm text-slate-500">
          No climate data available for the selected period.
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-sm text-slate-500">
          No data available
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>ERA5-Land</span>
        </div>
        <span className="tabular-nums">
          {periodLabel}
          {monthsProcessed > 0 ? ` · ${monthsProcessed}mo` : ""}
        </span>
      </div>
    </motion.div>
  );
}

export default SelectedLocation;
