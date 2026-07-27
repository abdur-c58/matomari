"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import type { PaddleTierPrice } from "@/hooks/use-paddle-price-preview";
import { formatAnimatedAmount } from "@/lib/paddle/price-display";

export function PaddlePriceCountup({
  price,
  className,
}: {
  price: PaddleTierPrice;
  className?: string;
}) {
  const [display, setDisplay] = useState(price.total);
  const prevAmount = useRef(price.amount);
  const mounted = useRef(false);

  useEffect(() => {
    const { amount, total, displayParts } = price;

    if (!mounted.current) {
      mounted.current = true;
      prevAmount.current = amount;
      setDisplay(total);
      return;
    }

    const from = prevAmount.current;
    prevAmount.current = amount;

    if (!Number.isFinite(from) || !Number.isFinite(amount) || from === amount) {
      setDisplay(total);
      return;
    }

    const controls = animate(from, amount, {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        setDisplay(formatAnimatedAmount(value, displayParts));
      },
      onComplete: () => {
        setDisplay(total);
      },
    });

    return () => controls.stop();
  }, [price]);

  return (
    <span className={className} aria-live="polite">
      {display}
    </span>
  );
}
