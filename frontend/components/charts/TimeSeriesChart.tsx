"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

type Props = {
  points: { t: string; v: number }[];
  unit: string;
  color?: string;
};

/**
 * Bloomberg Terminal style time series chart.
 *
 * Visual contract:
 *   - True-black background, no card chrome.
 *   - Single-color (amber by default) line, no fill, sharp corners.
 *   - 1-px grid in a near-black tint; axes drawn explicitly.
 *   - Monospace tick labels in a dim gray.
 *   - No animations, no legend, no point dots — terminal-grade.
 */
export function TimeSeriesChart({ points, unit, color = "#FFA500" }: Props) {
  const data = useMemo(
    () => ({
      labels: points.map((p) =>
        new Date(p.t).getUTCHours().toString().padStart(2, "0"),
      ),
      datasets: [
        {
          label: unit,
          data: points.map((p) => p.v),
          borderColor: color,
          backgroundColor: color,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 1.25,
        },
      ],
    }),
    [points, unit, color],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          intersect: false,
          mode: "index" as const,
          backgroundColor: "#000000",
          borderColor: "#FFA500",
          borderWidth: 1,
          titleColor: "#FFA500",
          bodyColor: "#FFFFFF",
          titleFont: { family: "ui-monospace, monospace", size: 10, weight: "bold" as const },
          bodyFont: { family: "ui-monospace, monospace", size: 10 },
          padding: 6,
          displayColors: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#666666",
            font: { family: "ui-monospace, monospace", size: 9 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: { color: "#1A1A1A", lineWidth: 1 },
          border: { color: "#333333" },
        },
        y: {
          ticks: {
            color: "#666666",
            font: { family: "ui-monospace, monospace", size: 9 },
          },
          grid: { color: "#1A1A1A", lineWidth: 1 },
          border: { color: "#333333" },
        },
      },
    }),
    [],
  );

  return (
    <div className="h-40 w-full bg-black">
      <Line data={data} options={options} />
    </div>
  );
}
