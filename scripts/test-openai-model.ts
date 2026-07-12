import OpenAI from "openai";
import { getOpenAIApiKey, getOpenAIModelName, isOpenAIConfigured } from "../lib/env";

async function tryModel(client: OpenAI, id: string) {
  try {
    const res = await client.chat.completions.create({
      model: id,
      messages: [{ role: "user", content: "Reply with exactly the word: ok" }],
      max_completion_tokens: 10,
    });
    console.log(`OK  ${id.padEnd(16)} -> ${res.model} | "${res.choices[0]?.message?.content?.trim()}"`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL ${id.padEnd(16)} -> ${message}`);
    return false;
  }
}

async function main() {
  if (!isOpenAIConfigured()) {
    console.error("FAIL: OPENAI_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const configured = getOpenAIModelName();
  console.log("Configured model:", configured);
  console.log("---");

  const client = new OpenAI({ apiKey: getOpenAIApiKey() });
  await tryModel(client, configured);

  console.log("---");
  console.log("Nearby models on your account:");
  for (const id of ["gpt-5.4-mini", "gpt-5-mini", "gpt-5.5", "gpt-5.6-luna"]) {
    await tryModel(client, id);
  }
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
