/**
 * Dark-theme-friendly color ramps for climate variables.
 * RGB triplets — ready to be composed into RGBA strings.
 */
export const RAMPS = {
  precip: [
    [255, 255, 255],
    [173, 216, 230],
    [70, 130, 180],
    [30, 80, 160],
    [120, 30, 120],
  ] as ReadonlyArray<readonly [number, number, number]>,
  temp: [
    [10, 30, 80],
    [40, 80, 160],
    [80, 180, 220],
    [240, 220, 130],
    [240, 130, 60],
    [180, 30, 30],
  ] as ReadonlyArray<readonly [number, number, number]>,
  wind: [
    [40, 60, 90],
    [120, 160, 200],
    [200, 220, 240],
    [255, 240, 180],
  ] as ReadonlyArray<readonly [number, number, number]>,
} as const;

export type RampId = keyof typeof RAMPS;
