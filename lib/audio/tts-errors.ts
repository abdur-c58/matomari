export class TtsQuotaError extends Error {
  constructor(message = "TTS quota / credits exhausted") {
    super(message);
    this.name = "TtsQuotaError";
  }
}

export class TtsGenerationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TtsGenerationError";
  }
}

/** @deprecated Use TtsQuotaError. Kept as an alias during the Fish Audio migration. */
export const ElevenLabsQuotaError = TtsQuotaError;
/** @deprecated Use TtsGenerationError. Kept as an alias during the Fish Audio migration. */
export const ElevenLabsTTSError = TtsGenerationError;
