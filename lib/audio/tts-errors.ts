export class ElevenLabsQuotaError extends Error {
  constructor(message = "ElevenLabs quota exceeded") {
    super(message);
    this.name = "ElevenLabsQuotaError";
  }
}

export class ElevenLabsTTSError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ElevenLabsTTSError";
  }
}
