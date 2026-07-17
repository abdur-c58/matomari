import { cn } from "@/lib/utils";

type StepIllustrationProps = {
  type: "meaning" | "shadow" | "recall" | "review";
  className?: string;
};

function MeaningScene() {
  return (
    <>
      <g data-step-illustration-part className="marketing-svg-layer marketing-svg-layer-back">
        <rect x="42" y="54" width="142" height="92" rx="18" fill="var(--surface)" opacity=".7" transform="rotate(-8 113 100)" />
        <path d="M66 80h82M66 99h58" stroke="var(--mode-meaning)" strokeWidth="8" strokeLinecap="round" opacity=".55" />
      </g>
      <g data-step-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <rect x="76" y="72" width="150" height="96" rx="20" fill="color-mix(in srgb, var(--mode-meaning) 38%, var(--surface))" stroke="var(--mode-meaning)" strokeWidth="3" />
        <text x="98" y="113" fill="var(--foreground)" fontSize="24" fontFamily="var(--font-japanese)">水が必要</text>
        <path d="M99 137h88" stroke="var(--mode-meaning)" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g data-step-illustration-part className="marketing-check-orbit">
        <circle cx="222" cy="66" r="25" fill="var(--mode-meaning)" />
        <path d="m210 66 8 8 16-18" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  );
}

function ShadowScene() {
  const bars = [28, 64, 96, 52, 110, 76, 40, 92, 58];
  return (
    <>
      <g data-step-illustration-part className="marketing-waveform">
        {bars.map((height, index) => (
          <rect
            key={index}
            className="marketing-wave-bar"
            style={{ animationDelay: `${index * -90}ms` }}
            x={48 + index * 24}
            y={112 - height / 2}
            width="13"
            height={height}
            rx="6.5"
            fill="color-mix(in srgb, var(--mode-listen) 78%, white)"
          />
        ))}
      </g>
      <g data-step-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <rect x="116" y="40" width="68" height="96" rx="34" fill="var(--mode-listen)" />
        <rect x="136" y="56" width="28" height="54" rx="14" fill="white" opacity=".92" />
        <path d="M103 105c0 28 19 47 47 47s47-19 47-47M150 152v28M124 180h52" fill="none" stroke="var(--foreground)" strokeWidth="7" strokeLinecap="round" />
      </g>
    </>
  );
}

function RecallScene() {
  return (
    <>
      <g data-step-illustration-part className="marketing-recall-card marketing-svg-layer-back">
        <rect x="46" y="55" width="126" height="118" rx="20" fill="var(--surface)" stroke="var(--mode-recall)" strokeWidth="3" />
        <text x="73" y="110" fill="var(--muted)" fontSize="16" fontFamily="var(--font-display)">I need water.</text>
        <path d="M76 139h65" stroke="var(--mode-recall)" strokeWidth="7" strokeLinecap="round" opacity=".55" />
      </g>
      <g data-step-illustration-part className="marketing-recall-card marketing-svg-layer-front">
        <rect x="128" y="67" width="126" height="118" rx="20" fill="color-mix(in srgb, var(--mode-recall) 42%, var(--surface))" stroke="var(--mode-recall)" strokeWidth="3" />
        <text x="153" y="124" fill="var(--foreground)" fontSize="22" fontFamily="var(--font-japanese)">水が必要です。</text>
        <path d="m171 153 9 9 20-23" fill="none" stroke="var(--mode-recall)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path data-step-illustration-part d="M104 40c38-26 89-22 120 8" fill="none" stroke="var(--mode-recall)" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 10" />
    </>
  );
}

function ReviewScene() {
  return (
    <>
      <g data-step-illustration-part className="marketing-review-orbit">
        <ellipse cx="150" cy="112" rx="96" ry="52" fill="none" stroke="var(--mode-review)" strokeWidth="3" strokeDasharray="9 10" opacity=".6" />
        <circle cx="61" cy="92" r="10" fill="var(--mode-review)" />
        <circle cx="236" cy="134" r="8" fill="var(--mode-meaning)" />
      </g>
      <g data-step-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <circle cx="150" cy="112" r="58" fill="color-mix(in srgb, var(--mode-review) 35%, var(--surface))" stroke="var(--mode-review)" strokeWidth="4" />
        <path d="m119 112 21 21 43-50" fill="none" stroke="var(--mode-review)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {[0, 1, 2].map((index) => (
        <path
          key={index}
          data-step-illustration-part
          className={`marketing-review-star marketing-review-star-${index + 1}`}
          d="m0-9 2.6 5.8L9-2.8 4.3 1.6 5.6 8 0 4.7-5.6 8l1.3-6.4L-9-2.8l6.4-.4Z"
          transform={`translate(${205 + index * 20} ${55 + index * 18}) scale(${0.75 - index * 0.12})`}
          fill="var(--mode-review)"
        />
      ))}
    </>
  );
}

export function StepIllustration({ type, className }: StepIllustrationProps) {
  return (
    <svg
      viewBox="0 0 300 220"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label={`${type} practice illustration`}
    >
      {type === "meaning" && <MeaningScene />}
      {type === "shadow" && <ShadowScene />}
      {type === "recall" && <RecallScene />}
      {type === "review" && <ReviewScene />}
    </svg>
  );
}
