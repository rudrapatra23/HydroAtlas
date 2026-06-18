import { Link } from "react-router-dom";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Solutions", href: "/#solutions" },
    { label: "Studio", href: "/studio" },
    { label: "Showcase", href: "/showcase" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs" },
    { label: "Changelog", href: "/docs" },
  ],
  Data: [
    { label: "ERA5-Land", href: "https://cds.climate.copernicus.eu", external: true },
    { label: "Copernicus CDS", href: "https://cds.climate.copernicus.eu", external: true },
    { label: "MapLibre", href: "https://maplibre.org", external: true },
  ],
  Company: [
    { label: "About", href: "/#" },
    { label: "GitHub", href: "https://github.com", external: true },
    { label: "Contact", href: "/#" },
  ],
} as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        {/* Link grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {category}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 22V12" stroke="white" strokeWidth="1.5" />
                <path d="M4 7l8 5 8-5" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">HydraAtlas</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} HydraAtlas. Climate intelligence for hydrology.
          </p>
        </div>
      </div>
    </footer>
  );
}
