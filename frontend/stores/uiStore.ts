"use client";

import { create } from "zustand";

/**
 * Client-side UI state for the landing page.
 *
 * Stays deliberately small. Only the cross-component concerns
 * (sidebar visibility, selection state) live here. Per-component
 * state stays in component-local hooks.
 */
type SelectedPoint = { lat: number; lon: number };

type State = {
  sidebarOpen: boolean;
  selectedVariable: string;
  selectedTime: string;
  selectedPoint: SelectedPoint | null;
  toggleSidebar: () => void;
  setVariable: (v: string) => void;
  setTime: (t: string) => void;
  setPoint: (p: SelectedPoint | null) => void;
};

export const useUIStore = create<State>((set) => ({
  sidebarOpen: true,
  selectedVariable: "precipitation",
  selectedTime: "2024-06-15T00:00:00Z",
  selectedPoint: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setVariable: (v) => set({ selectedVariable: v }),
  setTime: (t) => set({ selectedTime: t }),
  setPoint: (p) => set({ selectedPoint: p }),
}));
