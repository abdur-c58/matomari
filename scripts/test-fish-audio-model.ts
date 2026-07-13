/**
 * Smoke-test Fish Audio TTS model (default: s2.1-pro-free).
 * Usage: npx tsx --env-file=.env.local scripts/test-fish-audio-model.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getFishAudioApiKey,
  getFishAudioModel,
  getFishAudioVoiceId,
  isFishAudioConfigured,
} from "../lib/env";

const TEST_TEXT = "こんにちは。これは無料モデルのテストです。";
const OUT_DIR = path.join(import.meta.dirname, "..", "data", "audio-cache");
const TIMEOUT_MS = 60_000;

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { res, json };
}

async function getWalletBalance(): Promise<unknown | null> {
  const apiKey = getFishAudioApiKey();
  if (!apiKey) return null;

  const candidates = ["/v1/wallet", "/v1/wallet/balance"];
  for (const route of candidates) {
    const { res, json } = await fetchJson(`https://api.fish.audio${route}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) return json;
  }
  return null;
}

async function synthesize(model: string) {
  const apiKey = getFishAudioApiKey()!;
  const voiceId = getFishAudioVoiceId();

  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text: TEST_TEXT,
      ...(voiceId ? { reference_id: voiceId } : {}),
      format: "mp3",
      temperature: 0.7,
      top_p: 0.7,
      prosody: { speed: 1, volume: 0 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const billingHeaders: Record<string, string> = {};
  for (const [key, value] of res.headers.entries()) {
    if (/cost|credit|bill|usage|charge|price|balance/i.test(key)) {
      billingHeaders[key] = value;
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TTS failed (${res.status}): ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, billingHeaders, status: res.status };
}

async function main() {
  if (!isFishAudioConfigured()) {
    console.error("FAIL: FISH_AUDIO_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const model = getFishAudioModel();
  const utf8Bytes = Buffer.byteLength(TEST_TEXT, "utf8");

  console.log(`Configured model: ${model}`);
  console.log(`Test text UTF-8 bytes: ${utf8Bytes}`);
  console.log(`Documented price for ${model}: ${
    model === "s2.1-pro-free" ? "$0.00 / M UTF-8 bytes" : "see Fish Audio pricing docs"
  }\n`);

  const walletBefore = await getWalletBalance();
  if (walletBefore) console.log("Wallet before:", JSON.stringify(walletBefore));

  const started = Date.now();
  const { buffer, billingHeaders, status } = await synthesize(model);
  const elapsedMs = Date.now() - started;

  await mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `fish-model-test-${model}.mp3`);
  await writeFile(outFile, buffer);

  console.log(`TTS OK (${status}) in ${elapsedMs}ms`);
  console.log(`Audio size: ${buffer.length} bytes`);
  console.log(`Saved: ${outFile}`);

  if (Object.keys(billingHeaders).length > 0) {
    console.log("Billing headers:", JSON.stringify(billingHeaders, null, 2));
  } else {
    console.log("Billing headers: none returned by API");
  }

  const walletAfter = await getWalletBalance();
  if (walletAfter) {
    console.log("Wallet after:", JSON.stringify(walletAfter));
    if (walletBefore) {
      console.log(
        "Wallet unchanged:",
        JSON.stringify(walletBefore) === JSON.stringify(walletAfter)
      );
    }
  }

  if (model === "s2.1-pro-free") {
    console.log(
      "\nResult: s2.1-pro-free call succeeded. Fish Audio documents this model at $0.00 / M UTF-8 bytes (fair-use limits apply)."
    );
  }
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
