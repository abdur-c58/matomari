import OpenAI from "openai";
import { getOpenAIApiKey, getOpenAIModelName, isOpenAIConfigured } from "@/lib/env";

let client: OpenAI | null = null;

export { isOpenAIConfigured };

export function getOpenAIClient(): OpenAI {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function getOpenAIModel(): string {
  return getOpenAIModelName();
}
