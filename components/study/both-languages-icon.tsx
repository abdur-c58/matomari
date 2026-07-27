import { cn } from "@/lib/utils";

/**
 * Overlapping JP / EN cards for the scene browse "both" display mode.
 * Inline SVG so currentColor follows the toggle button state.
 */
export function BothLanguagesIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  const frontFill = active ? "var(--cta)" : "var(--background)";
  const frontGlyphFill = active ? "var(--cta-foreground)" : "currentColor";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6 shrink-0", className)}
      aria-hidden
    >
      {/* Back card — English */}
      <rect
        x="15"
        y="16"
        width="14"
        height="14"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="22"
        y="23.75"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="8.5"
        fontWeight={300}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        A
      </text>

      {/* Front card — Japanese */}
      <rect
        x="3"
        y="4"
        width="14"
        height="14"
        rx="3.5"
        fill={frontFill}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="10"
        y="12"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={frontGlyphFill}
        fontSize="11"
        fontFamily="'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
      >
        あ
      </text>
    </svg>
  );
}
