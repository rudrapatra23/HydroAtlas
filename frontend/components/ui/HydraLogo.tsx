type Props = {
  className?: string;
};

/**
 * HydraAtlas brand mark.
 *
 * Conceptually a water droplet containing a node-graph glyph,
 * rendered in the accent teal gradient. Pure SVG, no external
 * assets, scales crisply at any size.
 */
export function HydraLogo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="HydraAtlas logo"
    >
      <defs>
        <linearGradient
          id="hydraGrad"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M16 2C9 2 4 7 4 14c0 4 2 6 4 8 2 2 2 4 2 6 0 1 1 2 2 2h8c1 0 2-1 2-2 0-2 0-4 2-6 2-2 4-4 4-8C28 7 23 2 16 2z"
        fill="url(#hydraGrad)"
        opacity="0.18"
      />
      <path
        d="M16 5C11 5 7 9 7 14c0 2.5 1 4 2.5 5.5C11 21 11.5 22.5 11.5 25v2h9v-2c0-2.5.5-4 2-5.5C24 18 25 16.5 25 14c0-5-4-9-9-9z"
        stroke="url(#hydraGrad)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="16" cy="13" r="2" fill="url(#hydraGrad)" />
      <path
        d="M11 18c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5"
        stroke="url(#hydraGrad)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
