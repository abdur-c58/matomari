import { cn } from "@/lib/utils";

type IllustrationProps = {
  className?: string;
};

const particles = [
  [24, 36, 3],
  [258, 42, 2.5],
  [278, 164, 3],
  [38, 190, 2],
] as const;

function Particles() {
  return (
    <>
      {particles.map(([cx, cy, r], index) => (
        <circle
          key={`${cx}-${cy}`}
          data-illustration-particle
          className={`marketing-particle marketing-particle-${index + 1}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="currentColor"
          opacity="0.7"
        />
      ))}
    </>
  );
}

export function IslandsIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 300 220"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label="Layered topic islands"
    >
      <defs>
        <linearGradient id="island-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--mode-meaning)" />
          <stop offset="1" stopColor="var(--mode-listen)" />
        </linearGradient>
        <filter id="island-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse
        data-illustration-part
        cx="150"
        cy="184"
        rx="96"
        ry="18"
        fill="var(--mode-meaning)"
        opacity="0.18"
        filter="url(#island-glow)"
      />
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-back">
        <path
          d="M58 116c18-30 53-42 83-26 25 13 41 3 63 7 28 5 51 28 43 52-9 29-54 35-95 32-54-4-116-11-94-65Z"
          fill="color-mix(in srgb, var(--mode-meaning) 42%, var(--surface))"
          stroke="var(--mode-meaning)"
          strokeWidth="2"
        />
      </g>
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-mid">
        <path
          d="M74 87c23-25 49-31 77-17 23 12 39 2 61 7 25 6 39 26 28 44-15 24-54 27-91 22-48-6-103-17-75-56Z"
          fill="url(#island-gradient)"
          stroke="color-mix(in srgb, var(--mode-meaning) 80%, white)"
          strokeWidth="2"
        />
        <circle cx="119" cy="104" r="18" fill="rgba(255,255,255,.18)" />
        <path d="M111 104h16M119 96v16" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <path
          d="M99 57c18-18 40-23 62-12 19 10 31 2 49 7 19 6 28 22 18 35-14 18-43 18-72 13-36-6-78-15-57-43Z"
          fill="color-mix(in srgb, var(--mode-listen) 78%, white)"
          stroke="var(--mode-listen)"
          strokeWidth="2"
          filter="url(#island-glow)"
        />
        <path d="M139 72h40" stroke="white" strokeWidth="5" strokeLinecap="round" opacity=".9" />
        <path d="M139 83h25" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".65" />
      </g>
      <Particles />
    </svg>
  );
}

export function AudioIllustration({ className }: IllustrationProps) {
  const bars = [42, 72, 98, 58, 118, 82, 48, 104, 66, 90, 52];
  return (
    <svg
      viewBox="0 0 300 220"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label="Animated shadowing waveform"
    >
      <defs>
        <linearGradient id="audio-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="var(--mode-listen)" />
          <stop offset=".55" stopColor="color-mix(in srgb, var(--mode-listen) 60%, white)" />
          <stop offset="1" stopColor="var(--mode-meaning)" />
        </linearGradient>
        <filter id="audio-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        data-illustration-part
        cx="150"
        cy="110"
        r="86"
        fill="var(--mode-listen)"
        opacity=".1"
        filter="url(#audio-glow)"
      />
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-back">
        <circle cx="150" cy="110" r="68" fill="none" stroke="var(--mode-listen)" strokeWidth="2" opacity=".35" />
        <circle cx="150" cy="110" r="84" fill="none" stroke="var(--mode-listen)" strokeWidth="1.5" opacity=".16" />
      </g>
      <g data-illustration-part className="marketing-waveform" filter="url(#audio-glow)">
        {bars.map((height, index) => (
          <rect
            key={index}
            className="marketing-wave-bar"
            style={{ animationDelay: `${index * -80}ms` }}
            x={65 + index * 17}
            y={110 - height / 2}
            width="9"
            height={height}
            rx="4.5"
            fill="url(#audio-gradient)"
          />
        ))}
      </g>
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <circle cx="150" cy="110" r="28" fill="var(--surface)" stroke="var(--mode-listen)" strokeWidth="3" />
        <path d="m143 98 19 12-19 12Z" fill="var(--mode-listen)" />
      </g>
      <Particles />
    </svg>
  );
}

export function SharingIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 300 220"
      className={cn("h-full w-full overflow-visible", className)}
      role="img"
      aria-label="Animated connected sharing link"
    >
      <defs>
        <linearGradient id="share-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--mode-review)" />
          <stop offset="1" stopColor="var(--mode-meaning)" />
        </linearGradient>
        <filter id="share-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        data-illustration-part
        className="marketing-link-path"
        d="M99 136 201 84"
        fill="none"
        stroke="url(#share-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="12 12"
        filter="url(#share-glow)"
      />
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-back">
        <rect
          x="48"
          y="100"
          width="102"
          height="62"
          rx="28"
          transform="rotate(-20 99 131)"
          fill="color-mix(in srgb, var(--mode-review) 35%, var(--surface))"
          stroke="var(--mode-review)"
          strokeWidth="3"
        />
        <rect
          x="74"
          y="116"
          width="58"
          height="30"
          rx="15"
          transform="rotate(-20 103 131)"
          fill="var(--surface)"
        />
      </g>
      <g data-illustration-part className="marketing-svg-layer marketing-svg-layer-front">
        <rect
          x="150"
          y="58"
          width="102"
          height="62"
          rx="28"
          transform="rotate(-20 201 89)"
          fill="url(#share-gradient)"
          stroke="color-mix(in srgb, var(--mode-review) 75%, white)"
          strokeWidth="3"
          filter="url(#share-glow)"
        />
        <rect
          x="168"
          y="74"
          width="58"
          height="30"
          rx="15"
          transform="rotate(-20 197 89)"
          fill="var(--surface)"
        />
      </g>
      <g data-illustration-part className="marketing-copy-chip">
        <rect x="112" y="158" width="78" height="30" rx="15" fill="var(--mode-review)" />
        <path d="m137 173 8 8 17-19" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Particles />
    </svg>
  );
}
