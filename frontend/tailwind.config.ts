import type { Config } from "tailwindcss";

/**
 * HydraAtlas design tokens. Dark, premium, restrained.
 * Token names map 1:1 to Tailwind utilities so components can
 * reference them without inline hex values.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070a10",
          900: "#0b0f17",
          800: "#11161f",
          700: "#1a2230",
          600: "#26303f",
        },
        accent: {
          DEFAULT: "#5eead4",
          soft: "#22d3ee",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.2s ease-in-out infinite",
        "fade-in": "fade-in 240ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
