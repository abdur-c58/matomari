"use client";

import type { LibraryFilters, LibraryGroupBy, LibraryMeta, LibrarySortBy } from "@/lib/services/library-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDrawerProps {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  meta: LibraryMeta;
  activeFilterCount: number;
}

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 min-h-9",
    active
      ? "border-foreground bg-foreground/10 text-foreground"
      : "border-border bg-surface text-muted hover:border-foreground/30"
  );

const GROUP_OPTIONS: { value: LibraryGroupBy; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "scene", label: "Scene" },
  { value: "category", label: "Category" },
  { value: "subtopic", label: "Subtopic" },
  { value: "register", label: "Register" },
  { value: "difficulty", label: "Difficulty level" },
  { value: "rating", label: "Star rating" },
  { value: "status", label: "Study status" },
  { value: "tag", label: "Primary tag" },
];

const SORT_OPTIONS: { value: LibrarySortBy; label: string }[] = [
  { value: "default", label: "Default order" },
  { value: "english", label: "English A–Z" },
  { value: "japanese", label: "Japanese" },
  { value: "difficulty", label: "Difficulty" },
  { value: "rating", label: "Star rating" },
];

const STATUS_OPTIONS = [
  { v: null, l: "All" },
  { v: "active", l: "Active batch" },
  { v: "retired", l: "Retired" },
  { v: "unseen", l: "Unseen" },
  { v: "mastered", l: "Mastered" },
  { v: "weak", l: "Weak (1–2★)" },
  { v: "unrated", l: "Unrated" },
] as const;

export function FilterDrawer({ filters, onChange, meta, activeFilterCount }: FilterDrawerProps) {
  const diffMin = meta.difficulties[0] ?? 1;
  const diffMax = meta.difficulties[meta.difficulties.length - 1] ?? 9;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="relative shrink-0">
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters & grouping</DrawerTitle>
        </DrawerHeader>
        <div className="mt-2 flex-1 space-y-6 overflow-y-auto px-6 pb-8">
          <section>
            <Label className="mb-3 block">Group by</Label>
            <Select
              value={filters.groupBy}
              onValueChange={(v) => onChange({ ...filters, groupBy: v as LibraryGroupBy })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section>
            <Label className="mb-3 block">Sort by</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(v) => onChange({ ...filters, sortBy: v as LibrarySortBy })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section>
            <Label className="mb-3 block">Star rating</Label>
            <div className="mb-3 flex flex-wrap gap-2">
              {[null, 1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star ?? "all"}
                  type="button"
                  className={chipClass(filters.ratingExact === star)}
                  onClick={() =>
                    onChange({
                      ...filters,
                      ratingExact: star,
                      ratingMin: null,
                      ratingMax: null,
                    })
                  }
                >
                  {star === null ? "Any" : `${star}★`}
                </button>
              ))}
            </div>
            <Label className="mb-2 block text-xs text-muted">Or range</Label>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[filters.ratingMin ?? 1, filters.ratingMax ?? 5]}
              onValueChange={([min, max]) =>
                onChange({
                  ...filters,
                  ratingMin: min,
                  ratingMax: max,
                  ratingExact: null,
                })
              }
            />
            <p className="mt-2 text-xs text-muted">
              {filters.ratingMin ?? 1} – {filters.ratingMax ?? 5} stars
            </p>
          </section>

          <section>
            <Label className="mb-3 block">Study status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  className={chipClass(filters.status === v)}
                  onClick={() => onChange({ ...filters, status: v })}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {meta.sceneKeys.length > 0 && (
            <section>
              <Label>Scene</Label>
              <Select
                value={filters.sceneKey ?? "all"}
                onValueChange={(v) =>
                  onChange({
                    ...filters,
                    sceneKey: v === "all" ? null : v,
                    sourceType: v === "all" ? filters.sourceType : "scene",
                  })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All scenes</SelectItem>
                  {meta.sceneKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          )}

          <section>
            <Label className="mb-3 block">Translation</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: null, l: "All" },
                { v: "yes" as const, l: "Translated" },
                { v: "no" as const, l: "Untranslated" },
              ].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  className={chipClass(filters.translated === v)}
                  onClick={() => onChange({ ...filters, translated: v })}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="mb-3 block">Meaning confirmed</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: null, l: "All" },
                { v: true, l: "Confirmed" },
                { v: false, l: "Not confirmed" },
              ].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  className={chipClass(filters.meaningConfirmed === v)}
                  onClick={() =>
                    onChange({
                      ...filters,
                      meaningConfirmed: v as boolean | null,
                    })
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="mb-3 block">Register</Label>
            <div className="flex flex-wrap gap-2">
              {["all", ...meta.registers].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={chipClass(
                    r === "all" ? !filters.register : filters.register === r
                  )}
                  onClick={() =>
                    onChange({ ...filters, register: r === "all" ? null : r })
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="mb-3 block">Difficulty</Label>
            <Slider
              min={diffMin}
              max={diffMax}
              step={1}
              value={[filters.difficultyMin ?? diffMin, filters.difficultyMax ?? diffMax]}
              onValueChange={([min, max]) =>
                onChange({ ...filters, difficultyMin: min, difficultyMax: max })
              }
            />
            <p className="mt-2 text-xs text-muted">
              Level {filters.difficultyMin ?? diffMin} – {filters.difficultyMax ?? diffMax}
            </p>
          </section>

          <section>
            <Label>Category</Label>
            <Select
              value={filters.category ?? "all"}
              onValueChange={(v) =>
                onChange({ ...filters, category: v === "all" ? null : v })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {meta.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section>
            <Label>Subtopic</Label>
            <Select
              value={filters.subtopic ?? "all"}
              onValueChange={(v) =>
                onChange({ ...filters, subtopic: v === "all" ? null : v })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {meta.subtopics.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <section>
            <Label>Tag</Label>
            <Select
              value={filters.tag ?? "all"}
              onValueChange={(v) => onChange({ ...filters, tag: v === "all" ? null : v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {meta.tags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** @deprecated Use FilterDrawer */
export const FilterSheet = FilterDrawer;

export function LibrarySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      placeholder="Search…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1"
    />
  );
}

export function LibraryQuickFilters({
  filters,
  onChange,
}: {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
}) {
  const quick: { label: string; active: boolean; onToggle: () => void }[] = [
    {
      label: "Active",
      active: filters.status === "active",
      onToggle: () =>
        onChange({ ...filters, status: filters.status === "active" ? null : "active" }),
    },
    {
      label: "Weak",
      active: filters.status === "weak",
      onToggle: () =>
        onChange({ ...filters, status: filters.status === "weak" ? null : "weak" }),
    },
    {
      label: "Unrated",
      active: filters.status === "unrated",
      onToggle: () =>
        onChange({ ...filters, status: filters.status === "unrated" ? null : "unrated" }),
    },
  ];

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {quick.map(({ label, active, onToggle }) => (
        <button key={label} type="button" onClick={onToggle} className={chipClass(active)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function ActiveFilterBadges({
  labels,
  onClear,
}: {
  labels: string[];
  onClear: () => void;
}) {
  if (labels.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {labels.map((f) => (
        <Badge key={f} variant="secondary" className="text-xs">
          {f}
        </Badge>
      ))}
      <button type="button" onClick={onClear} className="text-xs text-muted underline">
        Clear
      </button>
    </div>
  );
}
