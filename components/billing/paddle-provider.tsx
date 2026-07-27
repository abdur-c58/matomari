"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";
import {
  requirePublicPaddleClientToken,
  requirePublicPaddleEnvironment,
} from "@/lib/paddle/client-config";

type PaddleContextValue = {
  paddle: Paddle | null;
  ready: boolean;
  error: string | null;
};

const PaddleContext = createContext<PaddleContextValue>({
  paddle: null,
  ready: false,
  error: null,
});

export function usePaddle(): PaddleContextValue {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const environment = requirePublicPaddleEnvironment();
        const token = requirePublicPaddleClientToken();
        const instance = await initializePaddle({ environment, token });
        if (cancelled) return;
        if (!instance) {
          throw new Error("Paddle.js failed to initialize");
        }
        setPaddle(instance);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPaddle(null);
        setError(err instanceof Error ? err.message : "Paddle init failed");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ paddle, ready: Boolean(paddle), error }),
    [paddle, error]
  );

  return (
    <PaddleContext.Provider value={value}>{children}</PaddleContext.Provider>
  );
}
