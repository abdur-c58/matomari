import type { Island } from "@/types/sentence";

export interface PremadeFolder {
  id: string;
  name: string;
  order: number;
  description: string;
  themeKanji: string;
}

export interface PremadeCatalog {
  updatedAt: string;
  folders: PremadeFolder[];
  islands: Record<string, Island>;
  islandFolderAssignments: Record<string, string>;
}

export const EMPTY_PREMADE_CATALOG: PremadeCatalog = {
  updatedAt: "1970-01-01T00:00:00.000Z",
  folders: [],
  islands: {},
  islandFolderAssignments: {},
};
