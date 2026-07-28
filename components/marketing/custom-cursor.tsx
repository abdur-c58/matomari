"use client";

import { useEffect, useRef } from "react";
import "@/components/marketing/custom-cursor.css";
import {
  useIsFinePointer,
  usePrefersReducedMotion,
} from "@/components/marketing/motion/use-prefers-reduced-motion";
import {
  getMarketingCursorAudioProgress,
  isMarketingCursorAudioPlaying,
} from "@/components/marketing/motion/marketing-cursor-audio";

const INTERACTIVE_SELECTOR =
  "a, button, video, [role='button'], [data-cursor-interactive], input, select, textarea, label, [contenteditable='true']";
const HIGHLIGHT_SELECTOR = "[data-cursor-highlight]";
/** Extra left gutter so the morph highlight has room for the play control. */
const HIGHLIGHT_PAD_LEFT = 52;
const HIGHLIGHT_PAD_RIGHT = 18;
const HIGHLIGHT_PAD_Y = 10;
/** Cap tooltip type so long phrases fit on two lines. */
const HIGHLIGHT_FONT_MAX_PX = 18;
const HIGHLIGHT_FONT_SCALE = 0.58;
const HIGHLIGHT_TEXT_MAX_WIDTH_PX = 280;
/** How far the highlight can stretch from the phrase while still attached. */
const HIGHLIGHT_LEASH = 48;
/** Release only after the pointer leaves this outer radius. */
const HIGHLIGHT_RELEASE = 88;
/** Invisible hit-target drifts less so hover stays reliable. */
const HIGHLIGHT_HOST_LEASH = 12;
/** Fraction of pointer offset the highlight actually follows (heavy feel). */
const HIGHLIGHT_MAGNET_FOLLOW = 0.18;
/** Ignore tiny pointer wiggles so it stays planted. */
const HIGHLIGHT_DEADZONE = 10;

type SpringValue = {
  value: number;
  velocity: number;
};

function stepSpring(
  state: SpringValue,
  target: number,
  stiffness: number,
  damping: number,
  delta: number
) {
  const acceleration =
    (target - state.value) * stiffness - state.velocity * damping;
  state.velocity += acceleration * delta;
  state.value += state.velocity * delta;
}

function shortestAxisAngle(angle: number, current: number) {
  let next = angle;
  while (next - current > Math.PI / 2) next -= Math.PI;
  while (next - current < -Math.PI / 2) next += Math.PI;
  return next;
}

function angleDistance(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

export function MarketingCustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const coreAnchorRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const wispOneRef = useRef<HTMLSpanElement>(null);
  const wispTwoRef = useRef<HTMLSpanElement>(null);
  const highlightTextRef = useRef<HTMLSpanElement>(null);
  const finePointer = useIsFinePointer();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const coreAnchor = coreAnchorRef.current;
    const core = coreRef.current;
    const mark = markRef.current;
    const halo = haloRef.current;
    const wispOne = wispOneRef.current;
    const wispTwo = wispTwoRef.current;
    const highlightText = highlightTextRef.current;
    if (
      !root ||
      !coreAnchor ||
      !core ||
      !mark ||
      !halo ||
      !wispOne ||
      !wispTwo ||
      !highlightText ||
      !finePointer ||
      reduced
    ) {
      return;
    }

    document.documentElement.classList.add("marketing-custom-cursor");

    let targetX = -100;
    let targetY = -100;
    let pointerX = -100;
    let pointerY = -100;
    let previousX = -100;
    let previousY = -100;
    let movementAngle = 0;
    let previousMovementAngle = 0;
    let initialized = false;
    let visible = false;
    let raf = 0;
    let previousTime = performance.now();
    let highlightHost: HTMLElement | null = null;
    /** "exit" keeps the morph collapsing toward the pointer after leave. */
    let highlightPhase: "idle" | "active" | "exit" = "idle";

    const stretchX: SpringValue = { value: 1, velocity: 0 };
    const squeezeY: SpringValue = { value: 1, velocity: 0 };
    const rotation: SpringValue = { value: 0, velocity: 0 };
    let starAngle = 0;
    let starSpinVelocity = 0;
    let starStepPhase = 0;
    const STAR_STEP_INTERVAL = 0.7;
    const STAR_STEP_EASE = 0.32;
    const haloX: SpringValue = { value: -100, velocity: 0 };
    const haloY: SpringValue = { value: -100, velocity: 0 };
    const wispOneX: SpringValue = { value: -100, velocity: 0 };
    const wispOneY: SpringValue = { value: -100, velocity: 0 };
    const wispTwoX: SpringValue = { value: -100, velocity: 0 };
    const wispTwoY: SpringValue = { value: -100, velocity: 0 };
    const wispOneOpacity: SpringValue = { value: 0, velocity: 0 };
    const wispTwoOpacity: SpringValue = { value: 0, velocity: 0 };
    const highlightW: SpringValue = { value: 10, velocity: 0 };
    const highlightH: SpringValue = { value: 10, velocity: 0 };
    const posX: SpringValue = { value: -100, velocity: 0 };
    const posY: SpringValue = { value: -100, velocity: 0 };
    const jiggleX: SpringValue = { value: 1, velocity: 0 };
    const jiggleY: SpringValue = { value: 1, velocity: 0 };
    const jiggleRot: SpringValue = { value: 0, velocity: 0 };
    let jigglePhase = Math.random() * Math.PI * 2;
    let appliedDriftX = 0;
    let appliedDriftY = 0;
    let measuredTipW = 160;
    let measuredTipH = 44;

    const measureHighlightTip = () => {
      const clone = highlightText.cloneNode(true) as HTMLSpanElement;
      clone.style.position = "absolute";
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.maxWidth = `${HIGHLIGHT_TEXT_MAX_WIDTH_PX}px`;
      clone.style.width = "max-content";
      clone.style.whiteSpace = "normal";
      clone.style.display = "-webkit-box";
      clone.style.webkitBoxOrient = "vertical";
      clone.style.webkitLineClamp = "2";
      clone.style.overflow = "hidden";
      clone.style.lineHeight = highlightText.style.lineHeight || "1.35";
      clone.style.fontSize = highlightText.style.fontSize;
      clone.style.fontFamily = highlightText.style.fontFamily;
      clone.style.fontWeight = highlightText.style.fontWeight;
      clone.style.letterSpacing = highlightText.style.letterSpacing;
      document.body.appendChild(clone);
      const natural = Math.ceil(clone.scrollWidth);
      const width = Math.min(Math.max(natural, 48), HIGHLIGHT_TEXT_MAX_WIDTH_PX);
      clone.style.width = `${width}px`;
      const height = Math.ceil(clone.scrollHeight);
      clone.remove();
      measuredTipW = width;
      measuredTipH = Math.max(height, Math.ceil((Number.parseFloat(highlightText.style.fontSize) || 16) * 1.35));
    };

    const clearHighlightText = () => {
      highlightText.textContent = "";
      highlightText.style.fontSize = "";
      highlightText.style.lineHeight = "";
      highlightText.style.letterSpacing = "";
      highlightText.style.fontFamily = "";
      highlightText.style.fontWeight = "";
      highlightText.style.maxWidth = "";
    };

    const releaseHighlightHost = () => {
      if (!highlightHost) return;
      highlightHost.classList.remove("is-cursor-highlighted");
      highlightHost.style.transform = "";
      highlightHost = null;
      appliedDriftX = 0;
      appliedDriftY = 0;
    };

    const clearHighlightHost = () => {
      releaseHighlightHost();
      clearHighlightText();
      highlightPhase = "idle";
    };

    const beginHighlightExit = () => {
      if (highlightPhase !== "active") return;
      releaseHighlightHost();
      highlightPhase = "exit";
      root.dataset.highlight = "exit";
      targetX = pointerX;
      targetY = pointerY;
      // Nudge collapse so it reads as a quick retract, not a linger.
      highlightW.velocity -= 420;
      highlightH.velocity -= 280;
    };

    const finishHighlightExit = () => {
      highlightPhase = "idle";
      root.dataset.highlight = "false";
      clearHighlightText();
      core.style.width = "";
      core.style.height = "";
      highlightW.value = 10;
      highlightH.value = 10;
      highlightW.velocity = 0;
      highlightH.velocity = 0;
    };

    const render = (time: number) => {
      const delta = Math.min(Math.max((time - previousTime) / 1000, 0.001), 0.032);
      previousTime = time;

      const highlighting = highlightPhase === "active";
      const exiting = highlightPhase === "exit";
      const morphing = highlighting || exiting;

      // Fully idle: pointer parked, nothing morphing/animating. Skip all layout
      // reads and style writes — this loop otherwise runs forever at 60fps and
      // is pure wasted main-thread + GPU work on desktop.
      if (
        !morphing &&
        !isMarketingCursorAudioPlaying() &&
        Math.abs(targetX - posX.value) < 0.01 &&
        Math.abs(targetY - posY.value) < 0.01 &&
        Math.abs(targetX - haloX.value) < 0.05 &&
        Math.abs(targetY - haloY.value) < 0.05 &&
        Math.abs(targetX - wispTwoX.value) < 0.05 &&
        Math.abs(targetY - wispTwoY.value) < 0.05 &&
        Math.abs(stretchX.value - 1) < 0.002 &&
        Math.abs(squeezeY.value - 1) < 0.002 &&
        wispOneOpacity.value < 0.002 &&
        wispTwoOpacity.value < 0.002
      ) {
        raf = window.requestAnimationFrame(render);
        return;
      }

      if (highlighting && highlightHost) {
        const rect = highlightHost.getBoundingClientRect();
        const baseLeft = rect.left - appliedDriftX;
        const baseTop = rect.top - appliedDriftY;
        const stickX = baseLeft + rect.width / 2;
        const stickY = baseTop + rect.height / 2;

        // Size from the (smaller, wrapping) tooltip text — not the giant host line.
        const width = Math.max(
          120,
          HIGHLIGHT_PAD_LEFT + measuredTipW + HIGHLIGHT_PAD_RIGHT
        );
        const height = Math.max(40, measuredTipH + HIGHLIGHT_PAD_Y * 2);

        // Heavy magnet: mostly stuck to the phrase, only a soft tug toward the pointer.
        const toPointerX = pointerX - stickX;
        const toPointerY = pointerY - stickY;
        const pointerDist = Math.hypot(toPointerX, toPointerY) || 1;
        const beyondDeadzone = Math.max(0, pointerDist - HIGHLIGHT_DEADZONE);
        // Quadratic ease so small moves barely register; larger pulls stretch slowly.
        const pullT = Math.min(1, beyondDeadzone / HIGHLIGHT_LEASH);
        const pull = pullT * pullT * HIGHLIGHT_LEASH * HIGHLIGHT_MAGNET_FOLLOW;
        targetX = stickX + (toPointerX / pointerDist) * pull;
        targetY = stickY + (toPointerY / pointerDist) * pull;

        stepSpring(highlightW, width, 340, 24, delta);
        stepSpring(highlightH, height, 340, 24, delta);
        // Soft, overdamped springs — laggy / weighty, not snappy.
        stepSpring(posX, targetX, 72, 16, delta);
        stepSpring(posY, targetY, 68, 15, delta);

        jigglePhase += delta * 2.8;
        const idleJiggleX = 1 + Math.sin(jigglePhase * 0.9) * 0.006;
        const idleJiggleY = 1 + Math.cos(jigglePhase * 1.05) * 0.008;
        const settleEnergy = Math.min(
          (Math.abs(highlightW.velocity) +
            Math.abs(highlightH.velocity) +
            Math.abs(posX.velocity) * 0.35) /
            1400,
          1
        );
        stepSpring(jiggleX, idleJiggleX + settleEnergy * 0.02, 160, 16, delta);
        stepSpring(jiggleY, idleJiggleY - settleEnergy * 0.015, 160, 16, delta);
        stepSpring(jiggleRot, 0, 220, 24, delta);

        // Keep the invisible hit-target closer to home so attachment doesn't break early.
        const hostScale = Math.min(1, HIGHLIGHT_HOST_LEASH / pointerDist);
        appliedDriftX = toPointerX * hostScale * 0.45;
        appliedDriftY = toPointerY * hostScale * 0.45;
        highlightHost.style.transform =
          `translate3d(${appliedDriftX}px, ${appliedDriftY}px, 0)`;

        core.style.width = `${highlightW.value}px`;
        core.style.height = `${highlightH.value}px`;
      } else if (exiting) {
        targetX = pointerX;
        targetY = pointerY;
        // Retract toward the pointer while collapsing to the default ink dot.
        stepSpring(posX, targetX, 320, 22, delta);
        stepSpring(posY, targetY, 320, 22, delta);
        stepSpring(highlightW, 10, 420, 30, delta);
        stepSpring(highlightH, 10, 420, 30, delta);
        stepSpring(jiggleX, 1, 260, 24, delta);
        stepSpring(jiggleY, 1, 260, 24, delta);
        stepSpring(jiggleRot, 0, 260, 24, delta);

        core.style.width = `${Math.max(10, highlightW.value)}px`;
        core.style.height = `${Math.max(10, highlightH.value)}px`;

        if (
          highlightW.value < 16 &&
          highlightH.value < 16 &&
          Math.abs(highlightW.velocity) < 80 &&
          Math.abs(highlightH.velocity) < 80
        ) {
          finishHighlightExit();
        }
      } else {
        stepSpring(posX, targetX, 1, 1, delta);
        posX.value = targetX;
        posX.velocity = 0;
        stepSpring(posY, targetY, 1, 1, delta);
        posY.value = targetY;
        posY.velocity = 0;
        stepSpring(highlightW, 10, 420, 30, delta);
        stepSpring(highlightH, 10, 420, 30, delta);
        stepSpring(jiggleX, 1, 220, 22, delta);
        stepSpring(jiggleY, 1, 220, 22, delta);
        stepSpring(jiggleRot, 0, 220, 22, delta);
      }

      const deltaX = targetX - previousX;
      const deltaY = targetY - previousY;
      const distance = Math.hypot(deltaX, deltaY);
      const speed = distance / delta;
      const intensity = Math.min(speed / 1450, 1);

      let turn = 0;
      if (distance > 0.5) {
        movementAngle = Math.atan2(deltaY, deltaX);
        turn = Math.min(angleDistance(movementAngle, previousMovementAngle) / Math.PI, 1);
        previousMovementAngle = movementAngle;
      }

      const rotationTarget = shortestAxisAngle(movementAngle, rotation.value);
      const stretchTarget = 1 + intensity * 0.68;
      const squeezeTarget = 1 - intensity * 0.3;

      stepSpring(stretchX, stretchTarget, 250, 23, delta);
      stepSpring(squeezeY, squeezeTarget, 270, 24, delta);
      stepSpring(rotation, rotationTarget, 300, 28, delta);

      const followX = morphing ? posX.value : targetX;
      const followY = morphing ? posY.value : targetY;

      stepSpring(haloX, followX, 150, 21, delta);
      stepSpring(haloY, followY, 150, 21, delta);
      stepSpring(wispOneX, followX, 105, 18, delta);
      stepSpring(wispOneY, followY, 105, 18, delta);
      stepSpring(wispTwoX, followX, 72, 15, delta);
      stepSpring(wispTwoY, followY, 72, 15, delta);

      const wispEnergy = Math.min(
        Math.max((intensity - 0.18) * 0.34 + turn * 0.16, 0),
        0.3
      );
      stepSpring(wispOneOpacity, morphing ? 0 : wispEnergy, 180, 25, delta);
      stepSpring(wispTwoOpacity, morphing ? 0 : wispEnergy * 0.58, 145, 23, delta);

      const interactive = root.dataset.interactive === "true";
      const audioPlaying = isMarketingCursorAudioPlaying();
      // Progress rim whenever audio plays; enlarged speaker core only when idle (not interactive/morph).
      const showAudioRim = audioPlaying && !morphing;
      const showAudioCore = showAudioRim && !interactive;
      root.dataset.audio = showAudioRim ? "true" : "false";
      if (showAudioRim) {
        root.style.setProperty(
          "--audio-progress",
          String(getMarketingCursorAudioProgress())
        );
      } else {
        root.style.removeProperty("--audio-progress");
      }

      if (morphing) {
        starSpinVelocity *= Math.exp(-10 * delta);
        mark.style.transform = "scale(0)";
        core.style.transform =
          `rotate(${jiggleRot.value}rad) scale(${jiggleX.value}, ${jiggleY.value})`;
      } else if (interactive) {
        starAngle += deltaX * 1.35;
        starSpinVelocity += deltaX * 8;
        starSpinVelocity *= Math.exp(-6 * delta);
        starSpinVelocity = Math.max(-1080, Math.min(1080, starSpinVelocity));
        starAngle += starSpinVelocity * delta;

        starStepPhase += delta;
        const stepsDone = Math.floor(starStepPhase / STAR_STEP_INTERVAL);
        const cycleT = starStepPhase - stepsDone * STAR_STEP_INTERVAL;
        const easeProgress = Math.min(1, cycleT / STAR_STEP_EASE);
        const eased = 1 - (1 - easeProgress) ** 3;
        const timedAngle = stepsDone * 90 + eased * 90;

        mark.style.transform = `rotate(${starAngle + timedAngle}deg) scale(1)`;
        core.style.transform = "none";
        core.style.width = "";
        core.style.height = "";
      } else if (showAudioCore) {
        starSpinVelocity *= Math.exp(-10 * delta);
        mark.style.transform = "scale(0)";
        core.style.transform = "none";
        core.style.width = "";
        core.style.height = "";
      } else {
        starSpinVelocity *= Math.exp(-10 * delta);
        mark.style.transform = "scale(0)";
        core.style.transform =
          `rotate(${rotation.value}rad) scale(${stretchX.value}, ${squeezeY.value})`;
        core.style.width = "";
        core.style.height = "";
      }

      coreAnchor.style.transform =
        `translate3d(${followX}px, ${followY}px, 0) translate(-50%, -50%)`;
      halo.style.transform =
        `translate3d(${haloX.value}px, ${haloY.value}px, 0) translate(-50%, -50%)`;

      const wispRotation = `${movementAngle}rad`;
      wispOne.style.opacity = `${Math.max(0, wispOneOpacity.value)}`;
      wispOne.style.transform =
        `translate3d(${wispOneX.value}px, ${wispOneY.value}px, 0) ` +
        `translate(-50%, -50%) rotate(${wispRotation}) scale(${0.7 + intensity * 0.45}, ${0.72 - intensity * 0.16})`;
      wispTwo.style.opacity = `${Math.max(0, wispTwoOpacity.value)}`;
      wispTwo.style.transform =
        `translate3d(${wispTwoX.value}px, ${wispTwoY.value}px, 0) ` +
        `translate(-50%, -50%) rotate(${wispRotation}) scale(${0.55 + intensity * 0.32}, ${0.62 - intensity * 0.12})`;

      previousX = targetX;
      previousY = targetY;

      raf = window.requestAnimationFrame(render);
    };

    const show = () => {
      if (visible) return;
      visible = true;
      root.dataset.visible = "true";
    };

    const hide = () => {
      visible = false;
      root.dataset.visible = "false";
      root.dataset.highlight = "false";
      root.dataset.audio = "false";
      root.style.removeProperty("--audio-progress");
      clearHighlightHost();
      core.style.width = "";
      core.style.height = "";
      highlightW.value = 10;
      highlightH.value = 10;
      highlightW.velocity = 0;
      highlightH.velocity = 0;
    };

    const getStickPoint = (host: HTMLElement) => {
      const rect = host.getBoundingClientRect();
      const baseLeft = rect.left - appliedDriftX;
      const baseTop = rect.top - appliedDriftY;
      return {
        x: baseLeft + rect.width / 2,
        y: baseTop + rect.height / 2,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      const target = event.target as Element | null;
      const nextHost = target?.closest(HIGHLIGHT_SELECTOR) as HTMLElement | null;

      if (nextHost) {
        if (highlightHost !== nextHost) {
          releaseHighlightHost();
          highlightHost = nextHost;
          highlightHost.classList.add("is-cursor-highlighted");
          highlightPhase = "active";
          // Paint Japanese on the cursor layer (above the solid fill).
          const styles = window.getComputedStyle(nextHost);
          highlightText.textContent = nextHost.textContent?.trim() ?? "";
          const hostFontPx = Number.parseFloat(styles.fontSize) || 24;
          const tooltipFontPx = Math.max(
            14,
            Math.min(hostFontPx * HIGHLIGHT_FONT_SCALE, HIGHLIGHT_FONT_MAX_PX)
          );
          highlightText.style.fontSize = `${tooltipFontPx}px`;
          highlightText.style.lineHeight = "1.35";
          highlightText.style.letterSpacing = styles.letterSpacing;
          highlightText.style.fontFamily = styles.fontFamily;
          highlightText.style.fontWeight = styles.fontWeight;
          highlightText.style.maxWidth = `${HIGHLIGHT_TEXT_MAX_WIDTH_PX}px`;
          measureHighlightTip();
          // Soft pop on enter — keep it subtle.
          highlightW.velocity += 220;
          highlightH.velocity -= 140;
          jiggleX.velocity += 1.4;
          jiggleY.velocity -= 1.1;
        }
        root.dataset.highlight = "true";
        root.dataset.interactive = "false";
        const stick = getStickPoint(nextHost);
        targetX = stick.x;
        targetY = stick.y;
      } else if (highlightHost && highlightPhase === "active") {
        // Stay attached while the pointer is within release range —
        // allows dragging the highlight over neighbouring text/components.
        const stick = getStickPoint(highlightHost);
        const dist = Math.hypot(pointerX - stick.x, pointerY - stick.y);
        if (dist > HIGHLIGHT_RELEASE) {
          beginHighlightExit();
          const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
          root.dataset.interactive = interactive ? "true" : "false";
        } else {
          root.dataset.highlight = "true";
          root.dataset.interactive = "false";
          targetX = stick.x;
          targetY = stick.y;
        }
      } else if (highlightPhase === "exit") {
        targetX = pointerX;
        targetY = pointerY;
        const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
        root.dataset.interactive = interactive ? "true" : "false";
      } else {
        root.dataset.highlight = "false";
        targetX = pointerX;
        targetY = pointerY;
        const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
        root.dataset.interactive = interactive ? "true" : "false";
      }

      if (!initialized) {
        initialized = true;
        previousX = targetX;
        previousY = targetY;
        posX.value = targetX;
        posY.value = targetY;
        haloX.value = targetX;
        haloY.value = targetY;
        wispOneX.value = targetX;
        wispOneY.value = targetY;
        wispTwoX.value = targetX;
        wispTwoY.value = targetY;
      }
      show();
    };

    const onPointerDown = () => {
      root.dataset.pressed = "true";
    };

    const onPointerUp = () => {
      root.dataset.pressed = "false";
    };

    const onVisibility = () => {
      if (document.hidden) hide();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    document.addEventListener("visibilitychange", onVisibility);
    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.documentElement.removeEventListener("mouseleave", hide);
      document.removeEventListener("visibilitychange", onVisibility);
      clearHighlightHost();
      document.documentElement.classList.remove("marketing-custom-cursor");
    };
  }, [finePointer, reduced]);

  if (!finePointer || reduced) return null;

  return (
    <div
      ref={rootRef}
      className="marketing-cursor"
      data-visible="false"
      data-interactive="false"
      data-highlight="false"
      data-audio="false"
      data-pressed="false"
      aria-hidden
    >
      <div ref={haloRef} className="marketing-cursor-halo">
        <span className="marketing-cursor-orbit" />
        <span className="marketing-cursor-audio-ring" aria-hidden />
      </div>
      <span ref={wispTwoRef} className="marketing-cursor-wisp marketing-cursor-wisp-secondary" />
      <span ref={wispOneRef} className="marketing-cursor-wisp" />
      <div ref={coreAnchorRef} className="marketing-cursor-core-anchor">
        <div ref={coreRef} className="marketing-cursor-core">
          <span ref={markRef} className="marketing-cursor-core-mark">
            <span className="marketing-cursor-star-arm marketing-cursor-star-arm--v" />
            <span className="marketing-cursor-star-arm marketing-cursor-star-arm--h" />
            <span className="marketing-cursor-star-center" />
          </span>
          <span className="marketing-cursor-audio-icon" aria-hidden>
            <svg
              className="marketing-cursor-audio-icon-svg"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 5 6.5 9H3v6h3.5L11 19V5Z"
                fill="currentColor"
              />
              <path
                d="M15.5 8.5a5 5 0 0 1 0 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M18.5 5.5a9 9 0 0 1 0 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="marketing-cursor-highlight">
            <span className="marketing-cursor-highlight-play" aria-hidden>
              <span className="marketing-cursor-highlight-play-icon" />
            </span>
            <span ref={highlightTextRef} className="marketing-cursor-highlight-text" />
          </div>
        </div>
      </div>
    </div>
  );
}
