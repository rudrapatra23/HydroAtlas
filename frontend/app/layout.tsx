import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Root document metadata. The viewport themeColor matches the
 * ink-950 base so mobile browser chrome blends with the UI.
 */
export const metadata: Metadata = {
  title: "HydraAtlas — Cloud-Native Hydrology",
  description:
    "Spatial-temporal climate analytics for researchers, students, and civil engineers.",
};

export const viewport: Viewport = {
  themeColor: "#070a10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 font-sans text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
