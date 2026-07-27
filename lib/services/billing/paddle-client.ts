import {
  Environment,
  Paddle,
  type EventEntity,
} from "@paddle/paddle-node-sdk";
import { normalizePaddleWebhookSecret } from "@/lib/paddle/env";

let paddleSingleton: Paddle | null = null;

export function getPaddleEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim().toLowerCase();
  return env === "production" || env === "live"
    ? Environment.production
    : Environment.sandbox;
}

export function getPaddle(): Paddle {
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing PADDLE_API_KEY");
  }
  if (!paddleSingleton) {
    paddleSingleton = new Paddle(key, {
      environment: getPaddleEnvironment(),
    });
  }
  return paddleSingleton;
}

export function getPaddleWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing PADDLE_WEBHOOK_SECRET");
  }
  return normalizePaddleWebhookSecret(secret);
}

export async function unmarshalPaddleEvent(
  rawBody: string,
  signature: string
): Promise<EventEntity> {
  const paddle = getPaddle();
  return paddle.webhooks.unmarshal(
    rawBody,
    getPaddleWebhookSecret(),
    signature
  );
}
