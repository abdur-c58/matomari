import OpenAI from "openai";
import { ZodError } from "zod";

export function formatOpenAIError(error: unknown): { message: string; status: number } {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return {
        message:
          "OpenAI quota exceeded. Check billing and usage limits at platform.openai.com, or try a cheaper model via OPENAI_MODEL (e.g. gpt-4o-mini).",
        status: 429,
      };
    }
    if (error.status === 401) {
      return {
        message: "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local.",
        status: 503,
      };
    }
    if (error.status === 404) {
      return {
        message: `OpenAI model not found. Set OPENAI_MODEL to a model your account can access (e.g. gpt-4o-mini).`,
        status: 503,
      };
    }
    return {
      message: error.message || "OpenAI request failed",
      status: error.status ?? 502,
    };
  }

  if (error instanceof ZodError) {
    return {
      message:
        "AI returned an invalid scene shape (often from catalog reuse). Try generating again.",
      status: 400,
    };
  }

  if (error instanceof Error) {
    if (error.message === "AI_NOT_CONFIGURED") {
      return { message: "AI not configured", status: 503 };
    }
    return { message: error.message, status: 400 };
  }

  return { message: "AI request failed", status: 500 };
}

export function openAIErrorResponse(error: unknown) {
  const { message, status } = formatOpenAIError(error);
  return Response.json({ error: message }, { status });
}
