# HydraAtlas — Design & UX Fix Spec

**Purpose of this document:** This is a design brief for an AI coding agent (e.g. Antigravity). Paste relevant sections directly into a prompt, or reference this whole file with "follow design.md" if the agent supports file context. It covers what's wrong today and exactly what to build instead.

**Product context:** HydraAtlas is a climate/hydrology data platform (rainfall, soil moisture, surface runoff across India) built on ERA5-Land reanalysis data via Copernicus CDS. Primary users are researchers, hydrologists, and data analysts — not casual consumers. Trust, data provenance, and clarity matter more than marketing polish.

---

## 1. Design Principles

- **Audience first:** Design for a researcher scanning for accuracy and provenance, not a consumer browsing a SaaS landing page. Every generic "startup" visual choice should be questioned.
- **Instrument, not brochure:** The Studio should feel like a scientific instrument panel — dense, precise, legible — not a dashboard trying to look friendly.
- **No placeholders in shipped UI:** Empty preview boxes, flat-color mockups, and "coming soon" stubs actively damage credibility with this audience. Replace or remove them.
- **Precision with restraint:** Show only as much numeric precision as the reading supports. Full precision belongs in exports, not the UI.
- **Provenance visible everywhere:** Dataset name, resolution, date range, and last-updated status should be visible near any number, not buried.

---

## 2. Critical Fixes (do these first)

### 2.1 Documentation page is a stub
Currently: "Comprehensive documentation for HydraAtlas is being prepared" with a redirect to Studio. This is the first place a researcher checks before trusting the data — it cannot be empty.

**Build a real docs page with these sections:**
- **Getting Started** — what the tool does, who it's for, quickstart (select region → run analysis → export)
- **Data Sources** — ERA5-Land description, Copernicus CDS attribution, spatial resolution (0.1°), temporal coverage, update cadence, link to original dataset DOI/citation
- **Variables & Units** — table: variable name, unit, valid range, short definition (Rainfall/mm, Soil Moisture/mm, Surface Runoff/mm)
- **Methodology** — how raw reanalysis data is aggregated to region/period selections (mean? sum? which statistic)
- **API Reference** — endpoints, request/response shape, auth if any
- **Citing HydraAtlas** — BibTeX/plain-text citation block researchers can copy for papers
- **Changelog** — dataset and platform version history

### 2.2 Placeholder visuals on homepage
- "Interactive Studio Preview" empty box → replace with an actual annotated screenshot or short looping screen-capture (GIF/video) of the real Studio interface, map + chart + panel visible.
- "Multi-layer analysis visualization" (three flat colored squares) → replace with a real layered map screenshot showing rainfall/soil moisture/runoff overlays, or remove the mock and let the "01/02/03" text stand alone.

### 2.3 Selected Region panel clipping
In the chart-overlay view, the "Selected Region" side panel is cut off at the container edge (surface runoff value and label get truncated). Fix overflow/z-index so the panel is never clipped regardless of which tab (Time Series / Trend / Statistics / Export) is active underneath it.

### 2.4 Ambiguous gradient bar
Bottom-right "TOTAL PRECIPITATION (MM)" gradient strip has no axis, scale marks meaning, or legend explaining what it represents (colorbar? mini-histogram? range indicator?). Either:
- Label it clearly as a colorbar/legend tied to the map layer, with min/max values and a caption, **or**
- Remove it if it's not adding information beyond the stat card above.

### 2.5 Numeric precision
Stat cards currently show 6 decimal places (e.g. `12.321801 mm`, `0.896057 mm`). Round to **2 decimal places** in all UI displays. Full-precision values remain available in CSV/JSON exports. Use tabular/monospaced numerals so values align in columns.

---

## 3. Visual Direction

**Move away from generic SaaS template feel** (rounded cards, blue-on-white, Inter-style font, marketing-site spacing) toward a **data-instrument aesthetic**:

- **Typography:** Keep a clean sans-serif for body/UI text, but use a monospace or tabular-figure font for all numeric readouts (stat cards, chart axes, tables) so digits align and read as data, not decoration.
- **Density:** Studio views should be denser than the marketing site — smaller padding, more information per screen, fewer large whitespace gaps. Researchers scan for numbers; don't force excessive scrolling/clicking to see them.
- **Color:** Keep the existing blue/green/orange semantic mapping (Rainfall/Soil Moisture/Runoff) — it's already sensible — but reduce saturation of decorative UI chrome (nav, buttons) so the semantic data colors stand out more clearly against everything else.
- **Trust marks:** Replace plain-text technology names ("ERA5-Land · Copernicus CDS · MapLibre GL · FastAPI · PostgreSQL · Amazon S3") with actual logos/icons, given at reasonable visual weight — right now this row is easy to miss and doesn't build credibility.
- **Consistency:** Ensure the "Selected Region" panel uses identical padding, shadow, and border-radius whether shown over the map or over the chart view — currently they diverge slightly.

---

## 4. Feature Additions Researchers Will Expect

- **Shareable permalink** — a URL that encodes region + date range + active layers, so a researcher can bookmark or share an exact view with a colleague or cite it in a paper.
- **Citation block** — visible in-app (not just in docs), a one-click "Copy citation" button producing BibTeX + plain text for the platform/dataset.
- **Last-updated timestamp** — per dataset, shown near the dataset selector ("ERA5-Land · updated 2026-07-01").
- **Direct export from map view** — CSV/GeoTIFF export accessible without switching to a separate "Export" tab; at minimum, add a visible export icon in the map toolbar.
- **Units and definitions on hover** — tooltip on each stat card and chart axis label defining the variable and its unit, sourced from the docs content in 2.1.

---

## 5. Example Prompt for Antigravity

Use or adapt this directly:

> Build/update the HydraAtlas Documentation page and Studio panel following `design.md`. Priorities in order: (1) replace the stub Documentation page with real content sections — Getting Started, Data Sources, Variables & Units table, Methodology, API Reference, Citing HydraAtlas, Changelog; (2) replace placeholder hero/preview visuals with real screenshots of the Studio; (3) fix the Selected Region panel so it never clips regardless of active tab; (4) round all displayed numeric values to 2 decimal places using tabular/monospace numerals, keeping full precision only in exports; (5) add a labeled legend to the precipitation gradient bar or remove it; (6) add a shareable permalink encoding region/date-range/layers, an in-app citation-copy button, and a dataset last-updated timestamp. Keep the existing color semantics (blue=rainfall, green=soil moisture, orange=runoff) but reduce decorative chrome saturation so data colors stand out. Match panel padding/shadow/radius consistently across map and chart views.

---

## 6. Things Explicitly NOT to Change

- The rainfall/soil-moisture/runoff color coding — it's intuitive and should stay.
- The overall map-first Studio layout (map + left config panel + right region-info panel) — the structure is fine, it's the polish and completeness that need work.
- The dataset (ERA5-Land) and layer toggle model — functionally sound, just needs the supporting docs and provenance UI around it.