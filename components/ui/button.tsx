import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gold-sheen text-white font-semibold shadow-[0_10px_30px_-10px_rgba(183,79,84,0.6)] hover:shadow-[0_14px_40px_-10px_rgba(183,79,84,0.8)] hover:brightness-105",
        outline:
          "border border-primary/40 text-foreground hover:border-primary/70 hover:bg-primary/10",
        ghost: "text-foreground/80 hover:bg-black/[0.04] hover:text-foreground",
        glass:
          "glass text-foreground hover:border-primary/40 hover:text-primary",
        subtle:
          "bg-black/[0.04] text-foreground/80 hover:bg-black/[0.06] hover:text-foreground border border-black/[0.06]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
