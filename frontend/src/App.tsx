import { lazy } from "react";
import { Routes, Route } from "react-router-dom";

/**
 * Route-level code splitting.
 * Studio (MapLibre + Chart.js) is lazy-loaded to keep the landing page bundle lean.
 */
const LandingPage = lazy(() => import("./pages/LandingPage"));
const StudioPage = lazy(() => import("./pages/StudioPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/showcase" element={<ShowcasePage />} />
    </Routes>
  );
}
