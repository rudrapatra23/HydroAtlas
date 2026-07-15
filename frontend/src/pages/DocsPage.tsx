import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";

/* ─── Types ─── */
interface DocSection {
  id: string;
  label: string;
  icon: string;
}

const SECTIONS: DocSection[] = [
  { id: "getting-started", label: "Getting Started", icon: "rocket_launch" },
  { id: "data-sources", label: "Data Sources", icon: "satellite_alt" },
  { id: "variables", label: "Variables & Units", icon: "straighten" },
  { id: "methodology", label: "Methodology", icon: "schema" },
  { id: "api-reference", label: "API Reference", icon: "api" },
  { id: "citing", label: "Citing HydraAtlas", icon: "format_quote" },
  { id: "changelog", label: "Changelog", icon: "history" },
];

const BIBTEX = `@software{hydraatlas2024,
  author       = {HydraAtlas Contributors},
  title        = {{HydraAtlas}: Climate Intelligence for Hydrology},
  year         = {2024},
  version      = {1.0.0},
  url          = {https://hydraatlas.dev},
  note         = {Powered by ERA5-Land reanalysis data via Copernicus CDS}
}`;

const PLAIN_CITATION = `HydraAtlas Contributors. (2024). HydraAtlas: Climate Intelligence for Hydrology (Version 1.0.0). https://hydraatlas.dev. Powered by ERA5-Land via Copernicus CDS.`;

/* ─── Sub-components ─── */
function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="block" style={{ scrollMarginTop: "6rem" }} />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-14 mb-5 first:mt-0">
      {children}
    </h2>
  );
}

function SectionProse({ children }: { children: React.ReactNode }) {
  return <div className="prose-sm text-slate-600 leading-relaxed space-y-4">{children}</div>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.82em] text-slate-800">
      {children}
    </code>
  );
}

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-200">
      {language && (
        <div className="flex items-center justify-between bg-slate-800 px-4 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {language}
          </span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
              {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="bg-slate-900 text-slate-200 text-[0.82rem] font-mono leading-relaxed p-4 overflow-x-auto whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "tip" | "note";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-800",
    note: "bg-amber-50 border-amber-200 text-amber-800",
  };
  const icons = { info: "info", tip: "lightbulb", note: "sticky_note_2" };
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <span className="material-symbols-rounded shrink-0" style={{ fontSize: 18 }}>
        {icons[type]}
      </span>
      <div>{children}</div>
    </div>
  );
}

/* ─── Variables table data ─── */
const VARIABLES_TABLE = [
  {
    name: "Total Precipitation",
    variable: "precipitation",
    ncName: "tp",
    unit: "mm",
    validRange: "0 – ~600",
    definition:
      "Accumulated liquid and frozen water (rain and snow) falling to the Earth's surface. Aggregated over the selected month.",
    color: "#2563EB",
  },
  {
    name: "Soil Moisture",
    variable: "soil_moisture",
    ncName: "swvl1",
    unit: "mm",
    validRange: "0 – ~70",
    definition:
      "Volumetric soil water in the 0–7 cm surface layer, expressed as equivalent water depth (mm). Converted from the ERA5 fractional unit (m³/m³) by multiplying by 70 mm (layer thickness).",
    color: "#16A34A",
  },
  {
    name: "Surface Runoff",
    variable: "surface_runoff",
    ncName: "sro",
    unit: "mm",
    validRange: "0 – ~200",
    definition:
      "Water that flows over the surface when precipitation exceeds infiltration capacity. Includes contributions from both overland flow and snowmelt.",
    color: "#EA580C",
  },
];

/* ─── API Reference data ─── */
const API_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/states",
    description: "List all available Indian states with their IDs.",
    response: `[{"id": "MH", "name": "Maharashtra"}, ...]`,
  },
  {
    method: "GET",
    path: "/api/states/{state_id}/districts",
    description: "List all districts for a given state.",
    response: `[{"id": "MH_PUNE", "name": "Pune", "state_id": "MH"}, ...]`,
  },
  {
    method: "GET",
    path: "/api/districts/{district_id}/time-series",
    description:
      "Fetch monthly mean/min/max statistics for a variable within a date range.",
    queryParams: [
      { name: "variable", type: "string", description: "One of: precipitation | soil_moisture | surface_runoff" },
      { name: "start_year", type: "integer", description: "Start year (e.g. 2020)" },
      { name: "start_month", type: "integer", description: "Start month 1–12" },
      { name: "end_year", type: "integer", description: "End year (e.g. 2024)" },
      { name: "end_month", type: "integer", description: "End month 1–12" },
    ],
    response: `{
  "district_id": "MH_PUNE",
  "variable": "precipitation",
  "points": [
    {"year": 2024, "month": 6, "mean": 124.5, "min": 0.0, "max": 287.2},
    ...
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/districts/{district_id}/raster-clip",
    description:
      "Return per-cell raster statistics for a single month, used to paint the choropleth map.",
    queryParams: [
      { name: "variable", type: "string", description: "One of: precipitation | soil_moisture | surface_runoff" },
      { name: "year", type: "integer", description: "Target year" },
      { name: "month", type: "integer", description: "Target month 1–12" },
    ],
    response: `{
  "variable_long_name": "Total Precipitation (mm)",
  "summary": {"min": 0.0, "p25": 45.2, "median": 98.7, "p75": 161.3, "max": 287.2, "valid_cells": 142},
  "feature_collection": { ...GeoJSON... }
}`,
  },
  {
    method: "GET",
    path: "/api/metadata/available-range",
    description: "Returns the earliest and latest month with data in the ERA5-Land archive.",
    response: `{"min_year": 1950, "min_month": 1, "max_year": 2024, "max_month": 12}`,
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
};

/* ─── Changelog data ─── */
const CHANGELOG = [
  {
    version: "1.1.0",
    date: "2026-07-01",
    type: "release",
    changes: [
      "Added shareable permalink encoding region, date range, and active layers",
      "In-app citation copy button (BibTeX + plain text)",
      "Dataset last-updated timestamp shown in Data Explorer",
      "Numeric precision in stat cards reduced to 2 decimal places; full precision preserved in CSV/JSON exports",
      "Map legend labeled with min/p25/median/p75/max tick marks",
      "Fixed Selected Region panel overflow clipping across all bottom-panel tabs",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-01-15",
    type: "release",
    changes: [
      "Initial public release",
      "ERA5-Land dataset integration via Copernicus CDS (precipitation, soil moisture, surface runoff)",
      "MapLibre GL interactive map with district-level selection",
      "Time series, trend, statistics, and export (CSV/JSON) analysis tabs",
      "Dual-axis chart for soil moisture vs. rainfall/runoff",
      "FastAPI backend with PostgreSQL metadata store and Amazon S3 raster store",
    ],
  },
];

/* ─── Main Page ─── */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [bibtexCopied, setBibtexCopied] = useState(false);
  const [plainCopied, setPlainCopied] = useState(false);

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyBibtex = () => {
    navigator.clipboard.writeText(BIBTEX).then(() => {
      setBibtexCopied(true);
      setTimeout(() => setBibtexCopied(false), 2000);
    });
  };

  const copyPlain = () => {
    navigator.clipboard.writeText(PLAIN_CITATION).then(() => {
      setPlainCopied(true);
      setTimeout(() => setPlainCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-28 pb-24">
        {/* Page header */}
        <div className="mb-12">
          <p className="text-sm font-medium tracking-wide text-blue-600 uppercase">Documentation</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            HydraAtlas Reference
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
            Data sources, variable definitions, methodology, and API reference for hydrologists
            and researchers using ERA5-Land reanalysis data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              ERA5-Land · 0.1° resolution
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Dataset updated monthly
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              Coverage: 1950 – present
            </span>
          </div>
        </div>

        <div className="flex gap-12">
          {/* Sticky sidebar nav */}
          <nav
            className="hidden lg:block w-56 shrink-0"
            aria-label="Documentation sections"
          >
            <ul className="sticky top-24 space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => handleNavClick(s.id)}
                    className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                      activeSection === s.id
                        ? "bg-slate-900 text-white font-medium"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="material-symbols-rounded shrink-0" style={{ fontSize: 16 }}>
                      {s.icon}
                    </span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Quick links
              </p>
              <div className="space-y-2">
                <a
                  href="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>open_in_new</span>
                  ERA5-Land on CDS
                </a>
                <Link
                  to="/studio"
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>map</span>
                  Open Studio
                </Link>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            {/* ── Getting Started ── */}
            <SectionAnchor id="getting-started" />
            <SectionHeading>Getting Started</SectionHeading>
            <SectionProse>
              <p>
                HydraAtlas is an interactive geospatial analysis platform for ERA5-Land
                reanalysis data. It is designed for hydrologists, climate researchers, and
                data analysts who need rapid access to rainfall, soil moisture, and surface
                runoff data across India — without setting up their own data pipelines.
              </p>

              <Callout type="info">
                HydraAtlas is <strong>not</strong> a forecast tool. ERA5-Land is a
                retrospective reanalysis product; all data covers past conditions from
                January 1950 onwards, updated with a ~3-month lag relative to real time.
              </Callout>

              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
                Who it's for
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>Hydrology researchers studying water balance dynamics</li>
                <li>Agricultural planners monitoring seasonal soil moisture trends</li>
                <li>Disaster management teams tracking runoff and flood risk</li>
                <li>Climate scientists analysing long-term precipitation anomalies</li>
              </ul>

              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">
                Quickstart: three steps
              </h3>
              <ol className="list-none space-y-3">
                {[
                  {
                    step: "01",
                    title: "Select a region",
                    body: "Open Studio → click any Indian state in the Data Explorer (left panel) → click a district on the map to select it as your analysis region.",
                  },
                  {
                    step: "02",
                    title: "Configure date range & layers",
                    body: "Set start/end months in the Data Explorer. Toggle Rainfall, Soil Moisture, and/or Runoff layers on or off. The map choropleth updates to reflect the end month.",
                  },
                  {
                    step: "03",
                    title: "Analyse & export",
                    body: 'Click "Run Analysis" to open the bottom panel. Switch between Time Series, Trend, Statistics, and Export tabs. Download CSV or JSON for use in R, Python, or QGIS.',
                  },
                ].map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </SectionProse>

            {/* ── Data Sources ── */}
            <SectionAnchor id="data-sources" />
            <SectionHeading>Data Sources</SectionHeading>
            <SectionProse>
              <h3 className="text-base font-semibold text-slate-900 mb-2">ERA5-Land</h3>
              <p>
                HydraAtlas is powered exclusively by{" "}
                <a
                  href="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  ERA5-Land
                </a>
                , a global land-surface reanalysis dataset produced by the European Centre
                for Medium-Range Weather Forecasts (ECMWF) as part of the Copernicus Climate
                Change Service (C3S). ERA5-Land replays the land component of the ERA5
                climate reanalysis at a finer spatial resolution.
              </p>

              <div className="overflow-hidden rounded-lg border border-slate-200 mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Spatial resolution", "0.1° × 0.1° (~9 km at equator)"],
                      ["Temporal coverage", "January 1950 – present (~3-month lag)"],
                      ["Temporal resolution", "Monthly means (HydraAtlas aggregation unit)"],
                      ["Geographic scope", "India (approx. 6°N–37°N, 68°E–97°E)"],
                      ["Update cadence", "Monthly, trailing ~90 days behind real time"],
                      ["Source institution", "ECMWF / Copernicus Climate Change Service"],
                      ["License", "Copernicus License (free for research & commercial use with attribution)"],
                    ].map(([prop, val]) => (
                      <tr key={prop} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{prop}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">Attribution</h3>
              <p>
                If you use HydraAtlas in published research, you must cite both the platform
                (see{" "}
                <button
                  onClick={() => handleNavClick("citing")}
                  className="text-blue-600 hover:underline"
                >
                  Citing HydraAtlas
                </button>
                ) and the underlying dataset:
              </p>
              <Callout type="note">
                <strong>Required dataset citation:</strong> Muñoz Sabater, J. (2019): ERA5-Land monthly
                averaged data from 1950 to present. Copernicus Climate Change Service (C3S) Climate Data
                Store (CDS). DOI:{" "}
                <a
                  href="https://doi.org/10.24381/cds.68d2bb30"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  10.24381/cds.68d2bb30
                </a>
              </Callout>
            </SectionProse>

            {/* ── Variables & Units ── */}
            <SectionAnchor id="variables" />
            <SectionHeading>Variables & Units</SectionHeading>
            <SectionProse>
              <p>
                HydraAtlas exposes three ERA5-Land variables. All values displayed in the UI
                are expressed in <strong>millimetres (mm)</strong>. Full-precision raw values
                are available in CSV and JSON exports.
              </p>
            </SectionProse>

            <div className="mt-5 space-y-4">
              {VARIABLES_TABLE.map((v) => (
                <div
                  key={v.variable}
                  className="rounded-lg border border-slate-200 overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderLeft: `4px solid ${v.color}` }}
                  >
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{v.name}</span>
                        <code
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${v.color}15`,
                            color: v.color,
                          }}
                        >
                          {v.ncName}
                        </code>
                        <span className="text-xs text-slate-500">
                          Unit: <strong>{v.unit}</strong>
                        </span>
                        <span className="text-xs text-slate-500">
                          Typical range: <strong>{v.validRange} {v.unit}</strong>
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{v.definition}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Callout type="tip">
                <strong>Unit conversions:</strong> ERA5-Land stores precipitation and runoff
                in metres (m) per month. HydraAtlas multiplies by 1000 to convert to
                millimetres. Soil moisture (<InlineCode>swvl1</InlineCode>) is stored as a
                volumetric fraction (m³/m³) for the 0–7 cm layer and is converted to mm
                equivalent water depth by multiplying by 70.
              </Callout>
            </div>

            {/* ── Methodology ── */}
            <SectionAnchor id="methodology" />
            <SectionHeading>Methodology</SectionHeading>
            <SectionProse>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Spatial aggregation</h3>
              <p>
                ERA5-Land raster cells at 0.1° resolution are clipped to Indian district
                boundaries from the official Census of India shapefiles. For each district, all
                ERA5 grid cells whose centroids fall within the district polygon are retained.
                Per-cell values are stored individually (GeoJSON feature collection) to support
                choropleth rendering and are also aggregated to district-level summary
                statistics.
              </p>

              <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">Temporal aggregation</h3>
              <p>
                ERA5-Land provides monthly means. When a user selects a date range spanning
                multiple months, HydraAtlas computes the following statistics across that range:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>
                  <strong>Mean</strong> — arithmetic mean of monthly district-level means,
                  shown in stat cards and exported as the primary indicator
                </li>
                <li>
                  <strong>Min / Max</strong> — minimum and maximum of the per-month district
                  means within the selected range
                </li>
                <li>
                  <strong>Time series</strong> — the full sequence of monthly (mean, min, max)
                  values plotted in the Time Series and Trend charts
                </li>
              </ul>
              <Callout type="note">
                The map choropleth always shows a <strong>single snapshot month</strong> (the
                selected end month), not an average over the range. The stat cards in the
                Selected Region panel show the <strong>temporal mean</strong> over the full
                selected range.
              </Callout>

              <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">Trend analysis</h3>
              <p>
                The Trend tab fits an ordinary least-squares (OLS) linear regression to the
                monthly mean time series. The slope coefficient is displayed as an indicator
                of direction (increasing/flat/decreasing) but should not be used as a
                statistically rigorous trend estimate without checking for autocorrelation and
                seasonality. For publication-quality trend analysis, export the raw data and
                apply Mann-Kendall or Sen's slope tests.
              </p>

              <h3 className="text-base font-semibold text-slate-900 mt-5 mb-2">Data pipeline</h3>
              <ol className="list-none space-y-3">
                {[
                  { step: "1", text: "Automated download from Copernicus CDS API via a scheduled FastAPI background task" },
                  { step: "2", text: "NetCDF → GeoTIFF conversion and reprojection to EPSG:4326" },
                  { step: "3", text: "Raster tiles stored in Amazon S3; metadata and district statistics indexed in PostgreSQL" },
                  { step: "4", text: "Per-district time-series queries served from precomputed PostgreSQL aggregates" },
                  { step: "5", text: "On-demand raster clipping for district map views served from S3 GeoTIFF files" },
                ].map((item) => (
                  <li key={item.step} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-700">
                      {item.step}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ol>
            </SectionProse>

            {/* ── API Reference ── */}
            <SectionAnchor id="api-reference" />
            <SectionHeading>API Reference</SectionHeading>
            <SectionProse>
              <p>
                All API endpoints are served by the FastAPI backend at the base URL configured
                in the deployment. No authentication is required for read operations in the
                current release.
              </p>
              <p>
                All responses are JSON. Date ranges use integer <InlineCode>year</InlineCode>{" "}
                and <InlineCode>month</InlineCode> parameters (not ISO strings) so the backend
                never has to infer partial-month semantics.
              </p>
            </SectionProse>

            <div className="mt-5 space-y-5">
              {API_ENDPOINTS.map((ep) => (
                <div
                  key={ep.path}
                  className="rounded-lg border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                        METHOD_COLORS[ep.method] ?? "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <code className="font-mono text-sm text-slate-800">{ep.path}</code>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-sm text-slate-600">{ep.description}</p>
                    {ep.queryParams && ep.queryParams.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                          Query parameters
                        </p>
                        <div className="overflow-x-auto rounded border border-slate-200">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-500">Param</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-500">Type</th>
                                <th className="text-left px-3 py-2 font-semibold text-slate-500">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {ep.queryParams.map((p) => (
                                <tr key={p.name}>
                                  <td className="px-3 py-2 font-mono font-medium text-slate-800">{p.name}</td>
                                  <td className="px-3 py-2 text-slate-500 font-mono">{p.type}</td>
                                  <td className="px-3 py-2 text-slate-600">{p.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Example response
                      </p>
                      <CodeBlock language="json">{ep.response}</CodeBlock>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Citing ── */}
            <SectionAnchor id="citing" />
            <SectionHeading>Citing HydraAtlas</SectionHeading>
            <SectionProse>
              <p>
                If HydraAtlas contributes to a published work, please cite the platform using
                one of the formats below, and separately cite the underlying ERA5-Land dataset
                (see{" "}
                <button
                  onClick={() => handleNavClick("data-sources")}
                  className="text-blue-600 hover:underline"
                >
                  Data Sources
                </button>
                ).
              </p>
            </SectionProse>

            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    BibTeX
                  </span>
                  <button
                    onClick={copyBibtex}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                      {bibtexCopied ? "check" : "content_copy"}
                    </span>
                    {bibtexCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-200 text-[0.82rem] font-mono leading-relaxed p-4 overflow-x-auto whitespace-pre">
                  {BIBTEX}
                </pre>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Plain text
                  </span>
                  <button
                    onClick={copyPlain}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                      {plainCopied ? "check" : "content_copy"}
                    </span>
                    {plainCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed">
                  {PLAIN_CITATION}
                </div>
              </div>
            </div>

            {/* ── Changelog ── */}
            <SectionAnchor id="changelog" />
            <SectionHeading>Changelog</SectionHeading>
            <SectionProse>
              <p>Platform and dataset version history. Dataset updates (ERA5-Land ingestion) are tracked separately from platform (UI/API) releases.</p>
            </SectionProse>

            <div className="mt-5 space-y-6">
              {CHANGELOG.map((entry) => (
                <div key={entry.version} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      v
                    </div>
                    <div className="mt-2 w-px flex-1 bg-slate-200" />
                  </div>
                  <div className="pb-8 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900">
                        v{entry.version}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {entry.type}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{entry.date}</span>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {entry.changes.map((change, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
