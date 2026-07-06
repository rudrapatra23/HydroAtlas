/**
 * Regression test for H1.a (see .kimchi/docs/race-diagnosis.md).
 *
 * Before the fix, `selectedStateId` was in the map-init effect's
 * dependency array. Every state change tore down the MapLibre instance
 * via `map.remove()` and created a fresh one, producing blank-map
 * flicker and 1-3 s tile reloads. After the fix, the click handler
 * reads `selectedStateId` via a ref and the map-init effect runs
 * exactly once.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useAppStore } from "../../stores/useAppStore";

// Mock maplibre-gl with a constructor we can count. The factory is
// invoked lazily by vitest when the component imports maplibre-gl.
vi.mock("maplibre-gl", () => {
  const MockMap = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    resize: vi.fn(),
    fitBounds: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setData: vi.fn(),
    setFilter: vi.fn(),
    getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
    getLayer: vi.fn().mockReturnValue(true),
    isStyleLoaded: vi.fn().mockReturnValue(true),
    queryRenderedFeatures: vi.fn().mockReturnValue([]),
  }));
  return {
    default: { Map: MockMap },
    Map: MockMap,
  };
});

import HydraMap from "./HydraMap";
import { Map as MapLibreMap } from "maplibre-gl";

const MockMapCtor = MapLibreMap as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  MockMapCtor.mockClear();
  useAppStore.setState({
    selectedStateId: null,
    selectedDistrictId: null,
    selectedVariable: "precipitation",
    startMonth: "2025-01",
    endMonth: "2025-12",
    availableRange: { minYear: 2025, minMonth: 1, maxYear: 2025, maxMonth: 12 },
    states: [],
    districts: [],
  });
});

describe("HydraMap — H1.a map teardown fix", () => {
  it("creates exactly one Map instance across many state changes", async () => {
    render(<HydraMap />);
    // One constructor call on initial mount.
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedStateId("IND.1.1_1");
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedStateId("IND.2.1_1");
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedStateId("IND.3.1_1");
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedStateId(null);
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);
  });

  it("creates exactly one Map instance across district / variable / month changes", async () => {
    render(<HydraMap />);
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedStateId("IND.1.1_1");
      useAppStore.getState().setSelectedDistrictId("IND.1.1.1_1");
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);

    await act(async () => {
      useAppStore.getState().setSelectedVariable("soil_moisture");
      useAppStore.getState().setStartMonth("2025-06");
      useAppStore.getState().setEndMonth("2025-08");
    });
    expect(MockMapCtor).toHaveBeenCalledTimes(1);
  });
});
