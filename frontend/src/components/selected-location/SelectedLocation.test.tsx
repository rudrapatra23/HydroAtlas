/**
 * Regression tests for H1.c (state change leaves loading stuck) and the
 * D1->D2->D3 rapid-district-change case. See
 * .kimchi/docs/race-diagnosis.md for the timeline.
 *
 * Before the fix, SelectedLocation's `let cancelled = false` pattern
 * plus an early-return path that did not reset `loading` produced:
 *   - Stuck "Processing new selection…" spinner when the user changed
 *     state while a fetch was in flight.
 *   - No defence against a late-arriving response from an older
 *     district overwriting a newer one.
 *
 * After the fix, each effect run captures a unique request id via a
 * ref and every async continuation checks `isCurrent()` before mutating
 * any state. The deselect early-return path resets all display state,
 * including `loading` and `hasAttempted`. An AbortController is also
 * wired as best-effort network cancellation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor, screen } from "@testing-library/react";
import { useAppStore } from "../../stores/useAppStore";

// Hold every DistrictRangeStatistics request keyed by districtId.
type Pending = {
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  signal?: AbortSignal;
};
const pendingByDistrict = new Map<string, Pending[]>();

function defaultStatsResponse(districtId: string, mean: number) {
  return {
    district_id: districtId,
    variable: "precipitation",
    start_year: 2025,
    start_month: 1,
    end_year: 2025,
    end_month: 12,
    months_processed: 12,
    mean,
    min: mean - 1,
    max: mean + 1,
  };
}

vi.mock("../../api/boundaries", () => ({
  getStates: vi.fn().mockResolvedValue([]),
  getDatasets: vi.fn().mockResolvedValue([]),
  getDistricts: vi.fn().mockResolvedValue([]),
  getDistrictsGeojson: vi.fn().mockResolvedValue({ type: "FeatureCollection", features: [] }),
  getDistrictRangeStatistics: vi.fn(
    (districtId: string, _body: any, signal?: AbortSignal) => {
      let resolve!: (v: any) => void;
      let reject!: (e: any) => void;
      const promise = new Promise<any>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const list = pendingByDistrict.get(districtId) ?? [];
      const entry: Pending = { promise, resolve, reject, signal };
      list.push(entry);
      pendingByDistrict.set(districtId, list);
      if (signal) {
        signal.addEventListener("abort", () => {
          const err = new DOMException("Aborted", "AbortError");
          // Only reject if still pending (i.e. nobody has called resolve).
          try {
            reject(err);
          } catch {
            // already settled
          }
        });
      }
      return promise;
    },
  ),
  getStateDistrictRangeStatistics: vi.fn(),
  getDistrictMonthlySeries: vi.fn(),
}));

import SelectedLocation from "./SelectedLocation";
import { getDistrictRangeStatistics } from "../../api/boundaries";

const mockedStats = getDistrictRangeStatistics as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  pendingByDistrict.clear();
  mockedStats.mockClear();
  useAppStore.setState({
    selectedStateId: "S1",
    selectedDistrictId: null,
    selectedVariable: "precipitation",
    startMonth: "2025-01",
    endMonth: "2025-12",
    availableRange: { minYear: 2025, minMonth: 1, maxYear: 2025, maxMonth: 12 },
    states: [
      { id: "S1", name: "State One" },
      { id: "S2", name: "State Two" },
    ],
    districts: [
      { id: "D1", name: "District One" },
      { id: "D2", name: "District Two" },
      { id: "D3", name: "District Three" },
    ],
  });
});

function spinnerCount(container: HTMLElement): number {
  return container.querySelectorAll(".animate-spin").length;
}

describe("SelectedLocation — H1.c state-change clears loading", () => {
  it("clears loading immediately when the user changes state mid-fetch, and discards the stale response", async () => {
    useAppStore.setState({ selectedDistrictId: "D1" });
    const { container } = render(<SelectedLocation />);

    // D1 is selected -> three parallel POSTs (one per variable) are in flight.
    await waitFor(() => {
      expect(pendingByDistrict.get("D1")?.length).toBe(3);
    });

    // The spinner / "Processing" badge is visible because loading is true.
    expect(spinnerCount(container)).toBeGreaterThan(0);

    // User clicks state S2. This nulls selectedDistrictId via the
    // store's composite setter. The deselect early-return path must
    // reset loading and hasAttempted IMMEDIATELY, not wait for the
    // pending POSTs to settle.
    await act(async () => {
      useAppStore.getState().setSelectedStateId("S2");
    });

    // Loading is gone right away.
    expect(spinnerCount(container)).toBe(0);

    // Now the pending D1 POSTs resolve. None of them may commit.
    await act(async () => {
      const pending = pendingByDistrict.get("D1") ?? [];
      for (const p of pending) {
        p.resolve(defaultStatsResponse("D1", 1.0));
      }
    });

    // Give React a tick to (incorrectly) commit if it could.
    await new Promise((r) => setTimeout(r, 10));

    // No spinner is back, no KPI numbers visible (component returns
    // null while no district is selected, so there is nothing to
    // assert beyond the absence of a spinner).
    expect(spinnerCount(container)).toBe(0);
  });
});

describe("SelectedLocation — D1 slow -> D2 -> D3 rapid district changes", () => {
  it("only the latest (D3) request commits; D1 and D2 stale responses are discarded", async () => {
    useAppStore.setState({ selectedDistrictId: "D1" });
    const { container } = render(<SelectedLocation />);

    // D1 in flight.
    await waitFor(() => {
      expect(pendingByDistrict.get("D1")?.length).toBe(3);
    });

    // Click D2 (same state).
    await act(async () => {
      useAppStore.getState().setSelectedDistrictId("D2");
    });
    await waitFor(() => {
      expect(pendingByDistrict.get("D2")?.length).toBe(3);
    });

    // Click D3.
    await act(async () => {
      useAppStore.getState().setSelectedDistrictId("D3");
    });
    await waitFor(() => {
      expect(pendingByDistrict.get("D3")?.length).toBe(3);
    });

    // Loading must still be true while D3 is in flight.
    expect(spinnerCount(container)).toBeGreaterThan(0);

    // Resolve D3 first with mean = 3.0 (i.e. KPI shows 3.000000).
    await act(async () => {
      const pending = pendingByDistrict.get("D3") ?? [];
      for (const p of pending) {
        p.resolve(defaultStatsResponse("D3", 3.0));
      }
    });

    // D3 visible — one KPI card per variable, so "3.000000" appears 3x.
    await waitFor(() => {
      expect(screen.queryAllByText("3.000000").length).toBe(3);
    });

    // Now resolve D2 with mean = 2.0. MUST NOT overwrite D3.
    await act(async () => {
      const pending = pendingByDistrict.get("D2") ?? [];
      for (const p of pending) {
        p.resolve(defaultStatsResponse("D2", 2.0));
      }
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryAllByText("2.000000").length).toBe(0);
    expect(screen.queryAllByText("3.000000").length).toBe(3);

    // And D1 with mean = 1.0. MUST NOT overwrite.
    await act(async () => {
      const pending = pendingByDistrict.get("D1") ?? [];
      for (const p of pending) {
        p.resolve(defaultStatsResponse("D1", 1.0));
      }
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryAllByText("1.000000").length).toBe(0);
    expect(screen.queryAllByText("3.000000").length).toBe(3);

    // Loading is now false (D3 finally cleared it).
    expect(spinnerCount(container)).toBe(0);
  });
});
