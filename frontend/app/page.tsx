"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { useUIStore } from "@/stores/uiStore";

/**
 * Landing page composition.
 *
 * Visual layers (back to front):
 *   1. Full-screen map (z-0, fills viewport)
 *   2. Navbar — glass card pinned to the top
 *   3. Sidebar — glass card pinned to the right
 *   4. Floating "open sidebar" handle — visible only when closed
 *
 * The page is a client component because it reads the sidebar
 * state to decide whether to render the reopen handle.
 */
export default function LandingPage() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink-950">
      <div className="absolute inset-0 z-0">
        <MapCanvas />
      </div>

      <Navbar />

      <Sidebar />

      {!sidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open analytics sidebar"
          className="glass fixed right-3 top-20 z-20 flex h-10 w-10 items-center justify-center rounded-2xl text-zinc-300 transition hover:text-zinc-50"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path
              d="M6 4l4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </main>
  );
}
