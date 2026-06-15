/**
 * Mock climate data for the landing-page demo.
 *
 * All values are synthetic and deterministic — no Math.random at
 * module scope, no backend, no I/O. Re-renders with the same
 * inputs always produce the same outputs.
 */

export type MockVariable = {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly ramp: "precip" | "temp" | "wind";
  readonly domain: readonly [number, number];
};

export const MOCK_VARIABLES: ReadonlyArray<MockVariable> = [
  {
    id: "rainfall",
    label: "Rainfall",
    unit: "mm/day",
    ramp: "precip",
    domain: [0, 50],
  },
  {
    id: "soil_moisture",
    label: "Soil Moisture",
    unit: "m³/m³",
    ramp: "precip",
    domain: [0, 0.5],
  },
  {
    id: "runoff",
    label: "Runoff",
    unit: "mm/day",
    ramp: "precip",
    domain: [0, 25],
  },
] as const;

export type MockTimeSeriesPoint = { t: string; v: number };

/**
 * Build a deterministic mock time series of ``length`` points
 * seeded by ``seed``. The same seed always yields the same series.
 */
export function buildMockTimeseries(
  seed: number,
  length = 48,
): MockTimeSeriesPoint[] {
  const base = MOCK_VARIABLES[0]!.domain[0];
  const span = MOCK_VARIABLES[0]!.domain[1] - base;
  const out: MockTimeSeriesPoint[] = [];
  let s = seed;
  for (let i = 0; i < length; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const wave = Math.sin((i / length) * Math.PI * 2 + (seed % 7)) * 0.3 + 0.5;
    out.push({
      t: new Date(Date.UTC(2024, 5, 14, i, 0, 0)).toISOString(),
      v: Number((base + span * (wave * 0.6 + r * 0.4)).toFixed(2)),
    });
  }
  return out;
}
