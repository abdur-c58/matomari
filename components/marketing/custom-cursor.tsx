"use client";

import { useEffect, useRef } from "react";
import {
  useIsFinePointer,
  usePrefersReducedMotion,
} from "@/components/marketing/motion/use-prefers-reduced-motion";

const INTERACTIVE_SELECTOR =
  "a, button, video, [role='button'], [data-cursor-interactive]";

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
  const haloRef = useRef<HTMLDivElement>(null);
  const wispOneRef = useRef<HTMLSpanElement>(null);
  const wispTwoRef = useRef<HTMLSpanElement>(null);
  const finePointer = useIsFinePointer();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const coreAnchor = coreAnchorRef.current;
    const core = coreRef.current;
    const halo = haloRef.current;
    const wispOne = wispOneRef.current;
    const wispTwo = wispTwoRef.current;
    if (
      !root ||
      !coreAnchor ||
      !core ||
      !halo ||
      !wispOne ||
      !wispTwo ||
      !finePointer ||
      reduced
    ) {
      return;
    }

    document.documentElement.classList.add("marketing-custom-cursor");

    let targetX = -100;
    let targetY = -100;
    let previousX = -100;
    let previousY = -100;
    let movementAngle = 0;
    let previousMovementAngle = 0;
    let initialized = false;
    let visible = false;
    let raf = 0;
    let previousTime = performance.now();

    const stretchX: SpringValue = { value: 1, velocity: 0 };
    const squeezeY: SpringValue = { value: 1, velocity: 0 };
    const rotation: SpringValue = { value: 0, velocity: 0 };
    const haloX: SpringValue = { value: -100, velocity: 0 };
    const haloY: SpringValue = { value: -100, velocity: 0 };
    const wispOneX: SpringValue = { value: -100, velocity: 0 };
    const wispOneY: SpringValue = { value: -100, velocity: 0 };
    const wispTwoX: SpringValue = { value: -100, velocity: 0 };
    const wispTwoY: SpringValue = { value: -100, velocity: 0 };
    const wispOneOpacity: SpringValue = { value: 0, velocity: 0 };
    const wispTwoOpacity: SpringValue = { value: 0, velocity: 0 };

    const render = (time: number) => {
      const delta = Math.min(Math.max((time - previousTime) / 1000, 0.001), 0.032);
      previousTime = time;

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

      // Underdamped shape springs give the ink drop a restrained organic settle.
      stepSpring(stretchX, stretchTarget, 250, 23, delta);
      stepSpring(squeezeY, squeezeTarget, 270, 24, delta);
      stepSpring(rotation, rotationTarget, 300, 28, delta);

      stepSpring(haloX, targetX, 150, 21, delta);
      stepSpring(haloY, targetY, 150, 21, delta);
      stepSpring(wispOneX, targetX, 105, 18, delta);
      stepSpring(wispOneY, targetY, 105, 18, delta);
      stepSpring(wispTwoX, targetX, 72, 15, delta);
      stepSpring(wispTwoY, targetY, 72, 15, delta);

      const wispEnergy = Math.min(
        Math.max((intensity - 0.18) * 0.34 + turn * 0.16, 0),
        0.3
      );
      stepSpring(wispOneOpacity, wispEnergy, 180, 25, delta);
      stepSpring(wispTwoOpacity, wispEnergy * 0.58, 145, 23, delta);

      coreAnchor.style.transform =
        `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      core.style.transform =
        `rotate(${rotation.value}rad) scale(${stretchX.value}, ${squeezeY.value})`;
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
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!initialized) {
        initialized = true;
        previousX = targetX;
        previousY = targetY;
        haloX.value = targetX;
        haloY.value = targetY;
        wispOneX.value = targetX;
        wispOneY.value = targetY;
        wispTwoX.value = targetX;
        wispTwoY.value = targetY;
      }
      show();

      const target = event.target as Element | null;
      const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      root.dataset.interactive = interactive ? "true" : "false";
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
      data-pressed="false"
      aria-hidden
    >
      <div ref={haloRef} className="marketing-cursor-halo">
        <span className="marketing-cursor-orbit" />
      </div>
      <span ref={wispTwoRef} className="marketing-cursor-wisp marketing-cursor-wisp-secondary" />
      <span ref={wispOneRef} className="marketing-cursor-wisp" />
      <div ref={coreAnchorRef} className="marketing-cursor-core-anchor">
        <div ref={coreRef} className="marketing-cursor-core">
          <span className="marketing-cursor-core-mark" />
        </div>
      </div>
    </div>
  );
}
