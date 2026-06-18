import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Route-level code splitting is handled by React.lazy in App.tsx
    target: "esnext",
  },
});
