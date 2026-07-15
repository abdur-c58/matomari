export interface AudioCacheEntry {
  sentenceId: string;
  textHash: string;
  blob: Blob;
  createdAt: string;
  /** Optional expanded fields for online-first assets. */
  dialect?: string;
  speaker?: string;
  byteSize?: number;
}

export type AudioSessionState =
  | "locked"
  | "ready"
  | "loading"
  | "playing"
  | "paused"
  | "error";
