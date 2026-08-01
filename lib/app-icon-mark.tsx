/**
 * Renders the ICONS.logo glyph (components/icons.tsx) as JSX for next/og's
 * ImageResponse (Satori), which doesn't support dangerouslySetInnerHTML —
 * the circle/line geometry is copied verbatim from that SVG string.
 */
const BACKGROUND = "#0c0c0f";
const STROKE = "#8b7cf8";

export function LogoMark({ inset = 0.15 }: { inset?: number }) {
  const size = `${(1 - inset * 2) * 100}%`;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={STROKE}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="18" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="18" r="2.4" />
        <line x1="8.3" y1="6" x2="15.7" y2="6" />
        <line x1="6" y1="8.3" x2="6" y2="15.7" />
        <line x1="18" y1="8.3" x2="18" y2="15.7" />
        <line x1="8.3" y1="18" x2="15.7" y2="18" />
      </svg>
    </div>
  );
}
