import type { Environments } from "@paddle/paddle-js";

/** Client-safe Paddle environment — throws if unset or invalid. */
export function requirePublicPaddleEnvironment(): Environments {
  // Must use static process.env.NEXT_PUBLIC_* access so Next.js inlines the value.
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENV?.trim();
  if (!raw) {
    throw new Error(
      'Missing NEXT_PUBLIC_PADDLE_ENV. Set to "sandbox" or "production".'
    );
  }
  if (raw !== "sandbox" && raw !== "production") {
    throw new Error(
      `Invalid NEXT_PUBLIC_PADDLE_ENV="${raw}". Expected "sandbox" or "production".`
    );
  }
  return raw;
}

/** Client-side Paddle.js token — throws if unset. */
export function requirePublicPaddleClientToken(): string {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN. Create a client-side token in Paddle → Developer tools → Authentication."
    );
  }
  return token;
}
