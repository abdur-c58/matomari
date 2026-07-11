import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-base font-medium touch-manipulation transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] min-h-11 min-w-11 px-4",
  {
    variants: {
      variant: {
        default: "bg-cta text-cta-foreground shadow-sm hover:opacity-90",
        secondary:
          "bg-surface text-foreground border border-border shadow-sm hover:bg-surface-raised",
        outline: "border border-border bg-transparent hover:bg-border-subtle",
        ghost: "hover:bg-border-subtle",
        soft: "bg-surface-raised text-foreground hover:bg-border-subtle",
        destructive: "bg-destructive text-white shadow-sm hover:opacity-90",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-xl px-3 text-sm",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
