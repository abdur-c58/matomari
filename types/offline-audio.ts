export type OfflinePackageId = string; // islandKey or "__all__"

export interface OfflineAudioAsset {
  textHash: string;
  sentenceId: string;
  dialect: string;
  speaker: string;
  byteSize: number;
  blob: Blob;
  r2Key?: string;
  createdAt: string;
  islandKeys: string[];
}

export interface OfflinePackageRecord {
  id: OfflinePackageId;
  islandKey: string | null;
  label: string;
  dialect: string;
  textHashes: string[];
  totalBytes: number;
  status: "ready" | "partial" | "downloading" | "error";
  updatedAt: string;
  lastError?: string;
}

export type DownloadProgress = {
  active: boolean;
  label: string;
  completed: number;
  total: number;
  packageId?: string;
};
