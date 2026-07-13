"use client";

import { useState } from "react";
import { ChevronDown, ListChecks, Pause, Play, Plus, Square, X } from "lucide-react";
import type { IslandBrowseDisplay } from "@/lib/constants/island-browse";
import { DisplayModeToggle } from "@/components/study/display-mode-toggle";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAUSE_OPTIONS = [
  { value: "500", label: "0.5s" },
  { value: "800", label: "0.8s" },
  { value: "1200", label: "1.2s" },
  { value: "2000", label: "2s" },
  { value: "3000", label: "3s" },
  { value: "5000", label: "5s" },
];

const SPEED_OPTIONS = [
  { value: "0.75", label: "0.75×" },
  { value: "1", label: "1×" },
  { value: "1.25", label: "1.25×" },
  { value: "1.5", label: "1.5×" },
];

function formatPauseLabel(ms: number) {
  const match = PAUSE_OPTIONS.find((o) => Number(o.value) === ms);
  return match?.label ?? `${ms / 1000}s`;
}

function formatSpeedLabel(rate: number) {
  const match = SPEED_OPTIONS.find((o) => Number(o.value) === rate);
  return match?.label ?? `${rate}×`;
}

function PlaybackSettingsFields({
  pauseMs,
  playbackRate,
  onPauseMsChange,
  onPlaybackRateChange,
}: {
  pauseMs: number;
  playbackRate: number;
  onPauseMsChange: (ms: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="playlist-pause" className="text-sm font-medium text-foreground">
          Pause between sentences
        </Label>
        <p className="text-xs leading-relaxed text-muted">
          How long to wait after each sentence finishes before the next one starts.
        </p>
        <Select
          value={String(pauseMs)}
          onValueChange={(v) => onPauseMsChange(Number(v))}
        >
          <SelectTrigger id="playlist-pause" className="h-10 w-full rounded-xl text-sm">
            <SelectValue>{formatPauseLabel(pauseMs)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAUSE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="playlist-speed" className="text-sm font-medium text-foreground">
          Playback speed
        </Label>
        <p className="text-xs leading-relaxed text-muted">
          How fast each sentence is read aloud during casual playlist playback.
        </p>
        <Select
          value={String(playbackRate)}
          onValueChange={(v) => onPlaybackRateChange(Number(v))}
        >
          <SelectTrigger id="playlist-speed" className="h-10 w-full rounded-xl text-sm">
            <SelectValue>{formatSpeedLabel(playbackRate)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SPEED_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function IslandPlayerToolbar({
  displayMode,
  onDisplayModeChange,
  showCustomSentence,
  onAddSentence,
  selectionMode,
  selectionCount,
  onToggleSelectionMode,
  onClearSelection,
  playlistActive,
  isPaused,
  onPauseResume,
  onStopPlaylist,
  onRequestPlaylistPlayback,
  pauseMs,
  playbackRate,
  onPauseMsChange,
  onPlaybackRateChange,
}: {
  displayMode: IslandBrowseDisplay;
  onDisplayModeChange: (mode: IslandBrowseDisplay) => void;
  showCustomSentence?: boolean;
  onAddSentence?: () => void;
  selectionMode: boolean;
  selectionCount: number;
  onToggleSelectionMode: () => void;
  onClearSelection: () => void;
  playlistActive: boolean;
  isPaused: boolean;
  onPauseResume: () => void;
  onStopPlaylist: () => void;
  onRequestPlaylistPlayback: () => void;
  pauseMs: number;
  playbackRate: number;
  onPauseMsChange: (ms: number) => void;
  onPlaybackRateChange: (rate: number) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingsButton = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 w-7 shrink-0 rounded-full p-0 text-muted hover:text-foreground"
      onClick={() => setSettingsOpen(true)}
      aria-label="Playlist settings"
    >
      <ChevronDown className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <>
      {/* Mobile: single icon-first row */}
      <div className="flex flex-nowrap items-center gap-1.5 sm:hidden">
        <DisplayModeToggle
          value={displayMode}
          onChange={onDisplayModeChange}
          compact
        />

        {showCustomSentence && onAddSentence && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-7 shrink-0 rounded-full border-border/70 p-0"
            onClick={onAddSentence}
            aria-label="Add sentence"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant={selectionMode ? "secondary" : "outline"}
          className="h-7 w-7 shrink-0 rounded-full border-border/70 p-0"
          onClick={onToggleSelectionMode}
          aria-label={selectionMode ? "Done selecting" : "Select sentences"}
        >
          <ListChecks className="h-3.5 w-3.5" />
        </Button>

        {selectionMode && selectionCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 shrink-0 p-0"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {playlistActive ? (
          <div className="flex shrink-0 items-center rounded-full border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              className="h-7 w-7 shrink-0 rounded-full p-0"
              onClick={onPauseResume}
              aria-label={isPaused ? "Resume playlist" : "Pause playlist"}
            >
              {isPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 w-7 shrink-0 rounded-full p-0"
              onClick={onStopPlaylist}
              aria-label="Stop playlist"
            >
              <Square className="h-3 w-3 fill-current" />
            </Button>
            {settingsButton}
          </div>
        ) : (
          <div className="flex shrink-0 items-center rounded-full border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              className="h-7 w-7 shrink-0 rounded-full p-0"
              onClick={onRequestPlaylistPlayback}
              disabled={selectionMode && selectionCount === 0}
              aria-label={
                selectionMode && selectionCount > 0
                  ? `Play selected (${selectionCount})`
                  : "Play all"
              }
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            {settingsButton}
          </div>
        )}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Playlist settings</DialogTitle>
            <DialogDescription>
              Adjust timing and speed for casual playlist playback on this island.
            </DialogDescription>
          </DialogHeader>
          <PlaybackSettingsFields
            pauseMs={pauseMs}
            playbackRate={playbackRate}
            onPauseMsChange={onPauseMsChange}
            onPlaybackRateChange={onPlaybackRateChange}
          />
        </DialogContent>
      </Dialog>

      {/* Desktop: two-row labeled layout */}
      <div className="hidden sm:block">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DisplayModeToggle value={displayMode} onChange={onDisplayModeChange} />
          <div className="flex flex-wrap items-center gap-2">
            {showCustomSentence && onAddSentence && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-border/70"
                onClick={onAddSentence}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add sentence
              </Button>
            )}
            <Button
              size="sm"
              variant={selectionMode ? "secondary" : "outline"}
              className="rounded-full border-border/70"
              onClick={onToggleSelectionMode}
            >
              {selectionMode ? "Done selecting" : "Select sentences"}
            </Button>
            {selectionMode && selectionCount > 0 && (
              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {playlistActive ? (
              <>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={onPauseResume}
                  aria-label={isPaused ? "Resume playlist" : "Pause playlist"}
                >
                  {isPaused ? (
                    <Play className="mr-1 h-4 w-4" />
                  ) : (
                    <Pause className="mr-1 h-4 w-4" />
                  )}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  onClick={onStopPlaylist}
                  aria-label="Stop playlist"
                >
                  <Square className="mr-1 h-3.5 w-3.5 fill-current" />
                  Stop
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                onClick={onRequestPlaylistPlayback}
                disabled={selectionMode && selectionCount === 0}
              >
                <Play className="mr-1 h-4 w-4" />
                {selectionMode && selectionCount > 0
                  ? `Play selected (${selectionCount})`
                  : "Play all"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <PlaybackSettingsFields
            pauseMs={pauseMs}
            playbackRate={playbackRate}
            onPauseMsChange={onPauseMsChange}
            onPlaybackRateChange={onPlaybackRateChange}
          />
        </div>
      </div>
    </>
  );
}
