"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("radix-overlay fixed inset-0 z-50 bg-black/40", className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "bottom" | "right" }
>(({ className, children, side = "bottom", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-side={side}
      className={cn(
        "radix-sheet-content fixed z-50 gap-4 bg-surface p-6 shadow-lg",
        side === "bottom" &&
          "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        side === "right" &&
          "inset-y-0 right-0 flex h-full w-3/4 max-w-sm flex-col overflow-hidden border-l border-border pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
      {...props}
    >
      {side === "bottom" && (
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
      )}
      {side === "right" && (
        <DialogPrimitive.Close className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close menu</span>
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-lg font-semibold", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
