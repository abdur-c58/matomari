"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { createIslandFolder, renameIslandFolder } from "@/lib/services/island-folder-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Mode = "create" | "rename";

export function CreateIslandFolderDialog({
  compact,
  mode = "create",
  folderId,
  initialName = "",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: {
  compact?: boolean;
  mode?: Mode;
  folderId?: string;
  initialName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { setProgress } = useApp();
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState(initialName);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setProgress((prev) => {
      if (mode === "rename" && folderId) {
        return renameIslandFolder(prev, folderId, trimmed);
      }
      return createIslandFolder(prev, trimmed);
    });

    setOpen(false);
    setName("");
  };

  const isRename = mode === "rename";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            size={compact ? "sm" : "default"}
            variant="outline"
            className={cn(compact && "h-8 rounded-full px-3 text-xs")}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New folder
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isRename ? "Rename folder" : "New folder"}</DialogTitle>
            <DialogDescription>
              {isRename
                ? "Choose a new name for this folder."
                : "Create a folder to organize your islands."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name" className="sr-only">
              Folder name
            </Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              autoFocus
              maxLength={64}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isRename ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
