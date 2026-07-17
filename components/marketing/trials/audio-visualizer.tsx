"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AudioVisualizerProps = {
  analyser: AnalyserNode | null;
  active: boolean;
  accent: string;
  className?: string;
  barCount?: number;
  label?: string;
};

function resolveColor(cssColor: string, host: HTMLElement) {
  const previous = host.style.color;
  host.style.color = cssColor;
  const resolved = getComputedStyle(host).color;
  host.style.color = previous;
  return resolved || "currentColor";
}

export function AudioVisualizer({
  analyser,
  active,
  accent,
  className,
  barCount = 48,
  label = "Audio visualizer",
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const levelsRef = useRef<Float32Array>(new Float32Array(barCount));

  useEffect(() => {
    levelsRef.current = new Float32Array(barCount);
  }, [barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const frequency = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : null;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const color = resolveColor(accent, canvas);
      const levels = levelsRef.current;
      const slotWidth = width / barCount;
      const barWidth = Math.max(1, Math.min(1.6, slotWidth * 0.3));
      const centerY = height / 2;

      if (analyser && frequency && active) {
        analyser.getByteFrequencyData(frequency);
        const usable = Math.floor(frequency.length * 0.5);
        for (let i = 0; i < barCount; i += 1) {
          const start = Math.floor((i / barCount) * usable);
          const end = Math.max(start + 1, Math.floor(((i + 1) / barCount) * usable));
          let sum = 0;
          for (let j = start; j < end; j += 1) sum += frequency[j] ?? 0;
          const sample = sum / (end - start) / 255;
          // Emphasize speech-band energy a bit for clearer motion.
          const boosted = Math.pow(sample, 0.72);
          levels[i] = levels[i] * 0.55 + boosted * 0.45;
        }
      } else {
        for (let i = 0; i < barCount; i += 1) {
          levels[i] *= 0.82;
          if (levels[i] < 0.04) levels[i] = 0.04;
        }
      }

      for (let i = 0; i < barCount; i += 1) {
        const energy = levels[i] ?? 0.04;
        const halfHeight = Math.max(2, energy * height * 0.45);
        const x = i * slotWidth + (slotWidth - barWidth) / 2;
        const radius = barWidth / 2;

        context.globalAlpha = active ? 0.35 + energy * 0.65 : 0.28;
        context.fillStyle = color;

        // One continuous bar centered on the baseline: equal motion up and down,
        // with both halves touching so they read as a single equalizer.
        context.beginPath();
        if (typeof context.roundRect === "function") {
          context.roundRect(
            x,
            centerY - halfHeight,
            barWidth,
            halfHeight * 2,
            radius
          );
        } else {
          context.rect(x, centerY - halfHeight, barWidth, halfHeight * 2);
        }
        context.fill();
      }

      context.globalAlpha = 1;
      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [analyser, active, accent, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-12 w-full rounded-lg", className)}
      role="img"
      aria-label={active ? `${label} playing` : `${label} idle`}
    />
  );
}
