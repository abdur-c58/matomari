import type { Dataset, Sentence } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { isTranslated } from "@/lib/sentence-utils";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { getActiveBatchIds } from "./batch-service";

export type LibraryGroupBy =
  | "none"
  | "source"
  | "pathwayBatch"
  | "island"
  | "category"
  | "subtopic"
  | "register"
  | "difficulty"
  | "rating"
  | "status"
  | "tag";

export type LibrarySortBy = "default" | "english" | "japanese" | "difficulty" | "rating";

export type LibraryStatusFilter =
  | "active"
  | "retired"
  | "unseen"
  | "mastered"
  | "weak"
  | "unrated"
  | null;

export interface LibraryFilters {
  search: string;
  ratingMin: number | null;
  ratingMax: number | null;
  ratingExact: number | null;
  category: string | null;
  subtopic: string | null;
  difficultyMin: number | null;
  difficultyMax: number | null;
  register: string | null;
  tag: string | null;
  status: LibraryStatusFilter;
  sourceType: "pathway" | "island" | null;
  pathwayBatch: number | null;
  islandKey: string | null;
  translated: "yes" | "no" | null;
  meaningConfirmed: boolean | null;
  groupBy: LibraryGroupBy;
  sortBy: LibrarySortBy;
}

export const defaultLibraryFilters: LibraryFilters = {
  search: "",
  ratingMin: null,
  ratingMax: null,
  ratingExact: null,
  category: null,
  subtopic: null,
  difficultyMin: null,
  difficultyMax: null,
  register: null,
  tag: null,
  status: null,
  sourceType: null,
  pathwayBatch: null,
  islandKey: null,
  translated: null,
  meaningConfirmed: null,
  groupBy: "none",
  sortBy: "default",
};

export type LibrarySentence = Sentence & {
  sourceType: "pathway" | "island";
  sourceKey: string;
};

export interface LibraryMeta {
  categories: string[];
  subtopics: string[];
  tags: string[];
  islandKeys: string[];
  pathwayBatches: { number: number; title: string }[];
  registers: string[];
  difficulties: number[];
}

export interface LibraryGroup {
  key: string;
  label: string;
  sentences: LibrarySentence[];
}

export function getLibrarySentences(dataset: Dataset): LibrarySentence[] {
  return Array.from(getAllSentences(dataset).values());
}

export function buildLibraryMeta(dataset: Dataset): LibraryMeta {
  const sentences = getLibrarySentences(dataset);
  const categories = new Set<string>();
  const subtopics = new Set<string>();
  const tags = new Set<string>();
  const registers = new Set<string>();
  const difficulties = new Set<number>();

  for (const s of sentences) {
    categories.add(s.category);
    subtopics.add(s.subtopic);
    registers.add(s.register);
    difficulties.add(s.difficulty);
    s.tags.forEach((t) => tags.add(t));
  }

  return {
    categories: [...categories].sort(),
    subtopics: [...subtopics].sort(),
    tags: [...tags].sort(),
    islandKeys: Object.keys(dataset.islands).sort(),
    pathwayBatches: dataset.main_pathway.batches.map((b) => ({
      number: b.batch_number,
      title: b.batch_title,
    })),
    registers: [...registers].sort(),
    difficulties: [...difficulties].sort((a, a2) => a - a2),
  };
}

function matchesStatus(
  s: LibrarySentence,
  sp: UserProgress["sentences"][string] | undefined,
  activeIds: Set<string>,
  status: LibraryStatusFilter
): boolean {
  if (!status) return true;
  const rating = sp?.rating ?? null;

  switch (status) {
    case "active":
      return activeIds.has(s.id);
    case "retired":
      return sp?.batchStatus === "retired";
    case "unseen":
      return !sp || sp.batchStatus === "unseen";
    case "mastered":
      return rating === 5;
    case "weak":
      return rating !== null && rating <= 2;
    case "unrated":
      return rating === null;
    default:
      return true;
  }
}

export function filterLibrarySentences(
  sentences: LibrarySentence[],
  progress: UserProgress,
  filters: LibraryFilters
): LibrarySentence[] {
  const activeIds = new Set(getActiveBatchIds(progress));

  let result = sentences.filter((s) => {
    const sp = progress.sentences[s.id];
    const rating = sp?.rating ?? null;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = isTranslated(s)
        ? `${s.japanese ?? ""} ${s.english} ${s.reading ?? ""} ${s.romaji ?? ""} ${s.id}`.toLowerCase()
        : `${s.english} ${s.tags.join(" ")} ${s.category} ${s.subtopic} ${s.id}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.ratingExact !== null) {
      if (rating !== filters.ratingExact) return false;
    } else {
      if (filters.ratingMin !== null && (rating ?? 0) < filters.ratingMin) return false;
      if (filters.ratingMax !== null && (rating ?? 0) > filters.ratingMax) return false;
    }

    if (filters.category && s.category !== filters.category) return false;
    if (filters.subtopic && s.subtopic !== filters.subtopic) return false;
    if (filters.difficultyMin !== null && s.difficulty < filters.difficultyMin) return false;
    if (filters.difficultyMax !== null && s.difficulty > filters.difficultyMax) return false;
    if (filters.register && s.register !== filters.register) return false;
    if (filters.tag && !s.tags.includes(filters.tag)) return false;

    if (filters.sourceType && s.sourceType !== filters.sourceType) return false;
    if (filters.pathwayBatch !== null && s.sourceType === "pathway") {
      if (Number(s.sourceKey) !== filters.pathwayBatch) return false;
    }
    if (filters.islandKey && s.sourceType === "island" && s.sourceKey !== filters.islandKey) {
      return false;
    }

    if (filters.translated === "yes" && !isTranslated(s)) return false;
    if (filters.translated === "no" && isTranslated(s)) return false;

    if (filters.meaningConfirmed === true && !sp?.meaningConfirmed) return false;
    if (filters.meaningConfirmed === false && sp?.meaningConfirmed) return false;

    if (!matchesStatus(s, sp, activeIds, filters.status)) return false;

    return true;
  });

  result = sortLibrarySentences(result, progress, filters.sortBy);
  return result;
}

export function sortLibrarySentences(
  sentences: LibrarySentence[],
  progress: UserProgress,
  sortBy: LibrarySortBy
): LibrarySentence[] {
  if (sortBy === "default") return sentences;

  return [...sentences].sort((a, b) => {
    const spA = progress.sentences[a.id];
    const spB = progress.sentences[b.id];

    switch (sortBy) {
      case "english":
        return a.english.localeCompare(b.english);
      case "japanese":
        return (a.japanese ?? a.english).localeCompare(b.japanese ?? b.english);
      case "difficulty":
        return a.difficulty - b.difficulty;
      case "rating":
        return (spA?.rating ?? -1) - (spB?.rating ?? -1);
      default:
        return 0;
    }
  });
}

function formatLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function getStatusLabel(
  s: LibrarySentence,
  sp: UserProgress["sentences"][string] | undefined,
  activeIds: Set<string>
): string {
  if (activeIds.has(s.id)) return "Active batch";
  if (sp?.rating === 5) return "Mastered";
  if (sp?.batchStatus === "retired") return "Retired";
  if (sp && sp.rating !== null && sp.rating <= 2) return "Weak";
  if (!sp || sp.batchStatus === "unseen") return "Unseen";
  if (sp.rating === null) return "Unrated";
  return `${sp.rating} stars`;
}

export function groupLibrarySentences(
  sentences: LibrarySentence[],
  progress: UserProgress,
  groupBy: LibraryGroupBy,
  dataset: Dataset
): LibraryGroup[] {
  if (groupBy === "none" || sentences.length === 0) {
    return [{ key: "all", label: "All", sentences }];
  }

  const activeIds = new Set(getActiveBatchIds(progress));
  const groups = new Map<string, LibrarySentence[]>();

  const add = (key: string, sentence: LibrarySentence) => {
    const list = groups.get(key) ?? [];
    list.push(sentence);
    groups.set(key, list);
  };

  for (const s of sentences) {
    const sp = progress.sentences[s.id];

    switch (groupBy) {
      case "source":
        add(s.sourceType === "pathway" ? "pathway" : "island", s);
        break;
      case "pathwayBatch": {
        const key =
          s.sourceType === "pathway"
            ? `batch-${s.sourceKey}`
            : "not-pathway";
        add(key, s);
        break;
      }
      case "island": {
        const key = s.sourceType === "island" ? s.sourceKey : "main-pathway";
        add(key, s);
        break;
      }
      case "category":
        add(s.category, s);
        break;
      case "subtopic":
        add(s.subtopic, s);
        break;
      case "register":
        add(s.register, s);
        break;
      case "difficulty":
        add(String(s.difficulty), s);
        break;
      case "rating": {
        const rating = sp?.rating;
        add(rating === null ? "unrated" : String(rating), s);
        break;
      }
      case "status":
        add(getStatusLabel(s, sp, activeIds), s);
        break;
      case "tag": {
        const primary = s.tags[0] ?? "untagged";
        add(primary, s);
        break;
      }
    }
  }

  const batchTitle = (n: string) =>
    dataset.main_pathway.batches.find((b) => String(b.batch_number) === n)?.batch_title;

  const labelFor = (key: string): string => {
    switch (groupBy) {
      case "source":
        return key === "pathway" ? "Main pathway" : "Islands";
      case "pathwayBatch":
        if (key === "not-pathway") return "Islands & other";
        return `Batch ${key.replace("batch-", "")}${batchTitle(key.replace("batch-", "")) ? `: ${batchTitle(key.replace("batch-", ""))}` : ""}`;
      case "island":
        return key === "main-pathway" ? "Main pathway" : formatLabel(key);
      case "register":
        return key.charAt(0).toUpperCase() + key.slice(1);
      case "difficulty":
        return `Level ${key}`;
      case "rating":
        return key === "unrated" ? "Unrated" : `${key} star${key === "1" ? "" : "s"}`;
      default:
        return formatLabel(key);
    }
  };

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (groupBy === "difficulty" || groupBy === "rating") {
      if (a === "unrated") return 1;
      if (b === "unrated") return -1;
      return Number(a) - Number(b);
    }
    if (groupBy === "pathwayBatch") {
      if (a === "not-pathway") return 1;
      if (b === "not-pathway") return -1;
      return Number(a.replace("batch-", "")) - Number(b.replace("batch-", ""));
    }
    return labelFor(a).localeCompare(labelFor(b));
  });

  return sortedKeys.map((key) => ({
    key,
    label: labelFor(key),
    sentences: groups.get(key) ?? [],
  }));
}

export function countActiveFilters(filters: LibraryFilters): number {
  let n = 0;
  if (filters.ratingMin !== null || filters.ratingMax !== null) n++;
  if (filters.ratingExact !== null) n++;
  if (filters.category) n++;
  if (filters.subtopic) n++;
  if (filters.difficultyMin !== null || filters.difficultyMax !== null) n++;
  if (filters.register) n++;
  if (filters.tag) n++;
  if (filters.status) n++;
  if (filters.sourceType) n++;
  if (filters.pathwayBatch !== null) n++;
  if (filters.islandKey) n++;
  if (filters.translated) n++;
  if (filters.meaningConfirmed !== null) n++;
  if (filters.groupBy !== "none") n++;
  if (filters.sortBy !== "default") n++;
  return n;
}

export function describeActiveFilters(
  filters: LibraryFilters,
  meta: LibraryMeta
): string[] {
  const labels: string[] = [];
  if (filters.status) labels.push(`Status: ${filters.status}`);
  if (filters.ratingExact !== null) labels.push(`${filters.ratingExact}★`);
  else if (filters.ratingMin !== null || filters.ratingMax !== null) {
    labels.push(`Rating: ${filters.ratingMin ?? 1}–${filters.ratingMax ?? 5}★`);
  }
  if (filters.register) labels.push(filters.register);
  if (filters.category) labels.push(formatLabel(filters.category));
  if (filters.subtopic) labels.push(formatLabel(filters.subtopic));
  if (filters.tag) labels.push(`#${filters.tag}`);
  if (filters.difficultyMin !== null || filters.difficultyMax !== null) {
    labels.push(`Lv ${filters.difficultyMin ?? 1}–${filters.difficultyMax ?? 9}`);
  }
  if (filters.sourceType === "pathway") labels.push("Pathway only");
  if (filters.sourceType === "island") labels.push("Islands only");
  if (filters.pathwayBatch !== null) {
    const batch = meta.pathwayBatches.find((b) => b.number === filters.pathwayBatch);
    labels.push(batch ? `Batch ${batch.number}` : `Batch ${filters.pathwayBatch}`);
  }
  if (filters.islandKey) labels.push(formatLabel(filters.islandKey));
  if (filters.translated === "yes") labels.push("Translated");
  if (filters.translated === "no") labels.push("Untranslated");
  if (filters.meaningConfirmed === true) labels.push("Meaning confirmed");
  if (filters.meaningConfirmed === false) labels.push("Meaning unconfirmed");
  if (filters.groupBy !== "none") labels.push(`Group: ${filters.groupBy}`);
  if (filters.sortBy !== "default") labels.push(`Sort: ${filters.sortBy}`);
  return labels;
}
