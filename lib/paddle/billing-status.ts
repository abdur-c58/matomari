import { paddlePriceIdsFromEnv, readServerEnv } from "@/lib/paddle/env";

export type PaddleRuntimeEnvironment = "sandbox" | "production";

export type PaddleBillingStatus = {
  environment: PaddleRuntimeEnvironment;
  configured: boolean;
  apiKeyPresent: boolean;
  clientTokenPresent: boolean;
  webhookSecretPresent: boolean;
  pricesConfigured: boolean;
  /** True when NEXT_PUBLIC_PADDLE_ENV=production */
  isLive: boolean;
  /** Keys/token prefixes match the selected environment */
  keysMatchEnvironment: boolean;
  issues: string[];
  liveMigrationChecklist: string[];
};

function detectPublicEnvironment(): PaddleRuntimeEnvironment {
  const raw = readServerEnv("NEXT_PUBLIC_PADDLE_ENV")?.toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "sandbox";
}

function keyLooksSandbox(value: string): boolean {
  return (
    value.startsWith("pdl_sdbx_") ||
    value.startsWith("test_") ||
    /sandbox/i.test(value)
  );
}

function keyLooksLive(value: string): boolean {
  return value.startsWith("pdl_live_") || value.startsWith("live_");
}

export function getPaddleBillingStatus(): PaddleBillingStatus {
  const environment = detectPublicEnvironment();
  const isLive = environment === "production";
  const apiKey = readServerEnv("PADDLE_API_KEY") ?? "";
  const clientToken = readServerEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN") ?? "";
  const webhookSecret = readServerEnv("PADDLE_WEBHOOK_SECRET");
  const prices = paddlePriceIdsFromEnv();

  const issues: string[] = [];
  const apiKeyPresent = Boolean(apiKey);
  const clientTokenPresent = Boolean(clientToken);
  const webhookSecretPresent = Boolean(webhookSecret);
  const pricesConfigured = prices.configured;

  if (!apiKeyPresent) issues.push("Missing PADDLE_API_KEY");
  if (!clientTokenPresent) issues.push("Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  if (!webhookSecretPresent) issues.push("Missing PADDLE_WEBHOOK_SECRET");
  if (!pricesConfigured) {
    issues.push("One or more PADDLE_PRICE_* env vars are missing");
  }

  let keysMatchEnvironment = true;
  if (apiKeyPresent) {
    if (isLive && keyLooksSandbox(apiKey)) {
      keysMatchEnvironment = false;
      issues.push("PADDLE_API_KEY looks like sandbox but NEXT_PUBLIC_PADDLE_ENV is production");
    }
    if (!isLive && keyLooksLive(apiKey)) {
      keysMatchEnvironment = false;
      issues.push("PADDLE_API_KEY looks live but NEXT_PUBLIC_PADDLE_ENV is sandbox");
    }
  }
  if (clientTokenPresent) {
    if (isLive && keyLooksSandbox(clientToken)) {
      keysMatchEnvironment = false;
      issues.push("Client token looks like sandbox (test_…) but env is production");
    }
    if (!isLive && keyLooksLive(clientToken)) {
      keysMatchEnvironment = false;
      issues.push("Client token looks live (live_…) but env is sandbox");
    }
  }

  const configured =
    apiKeyPresent &&
    clientTokenPresent &&
    webhookSecretPresent &&
    pricesConfigured &&
    keysMatchEnvironment;

  const liveMigrationChecklist = [
    "Create live catalog prices in Paddle and set PADDLE_PRICE_* to live pri_… IDs",
    "Set NEXT_PUBLIC_PADDLE_ENV=production in Vercel production environment",
    "Replace PADDLE_API_KEY with live pdl_live_… key (Developer tools → Authentication)",
    "Replace NEXT_PUBLIC_PADDLE_CLIENT_TOKEN with live_… client-side token",
    "Create a live notification destination → PADDLE_WEBHOOK_SECRET (URL: https://www.matomari.com/api/webhooks/paddle)",
    "Set Paddle default payment link to https://www.matomari.com/pricing (approved domain)",
    "Run a real $0.01 or refund test checkout in production before announcing",
    "Keep sandbox keys in Preview/Development env vars only",
  ];

  return {
    environment,
    configured,
    apiKeyPresent,
    clientTokenPresent,
    webhookSecretPresent,
    pricesConfigured,
    isLive,
    keysMatchEnvironment,
    issues,
    liveMigrationChecklist,
  };
}
