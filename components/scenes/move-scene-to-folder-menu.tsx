"use client";

import { useState } from "react";
import { Check, FolderInput, MoreHorizontal } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  assignSceneToFolder,
  getSceneFolderId,
  getUserFolders,
} from "@/lib/services/scene-folder-service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MoveSceneToFolderMenu({
  sceneKey,
  isPremade = false,
  className,
}: {
  sceneKey: string;
  isPremade?: boolean;
  className?: string;
}) {
  const { progress, premadeCatalog, setProgress } = useApp();
  const [open, setOpen] = useState(false);
  const userFolders = getUserFolders(progress);
  const currentFolderId = getSceneFolderId(progress, sceneKey);

  if (isPremade) return null;

  const handleAssign = (folderId: string | null) => {
    setProgress((prev) =>
      assignSceneToFolder(prev, sceneKey, folderId, premadeCatalog)
    );
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 rounded-lg text-muted hover:text-foreground",
            className
          )}
          aria-label="Scene options"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {userFolders.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {userFolders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onSelect={() => handleAssign(folder.id)}
                >
                  <span className="flex-1 truncate">{folder.name}</span>
                  {currentFolderId === folder.id && (
                    <Check className="ml-2 h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuLabel className="text-xs font-normal text-muted">
            No folders yet
          </DropdownMenuLabel>
        )}
        {currentFolderId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleAssign(null)}>
              Remove from folder
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
