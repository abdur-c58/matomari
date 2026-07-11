export interface AudioCacheEntry {
  sentenceId: string;
  textHash: string;
  blob: Blob;
  createdAt: string;
}

export type AudioSessionState =
  | "locked"
  | "ready"
  | "loading"
  | "playing"
  | "paused"
  | "error";
