export type AudioManifestItem = {
  sentenceId: string;
  textHash: string;
  r2Key: string;
  dialect: string;
  speaker: string;
  byteSize: number | null;
  url?: string | null;
  streamPath: string;
};

export type AudioManifestResponse = {
  dialect: string;
  requested: number;
  ready: number;
  totalBytes: number;
  items: AudioManifestItem[];
};
