import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui-style button bound to Xarina tokens (BRAND.md › Components).
const buttonVariants = cva(
  "label inline-flex items-center justify-center gap-space-2 rounded-none transition-opacity disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-action text-on-action hover:opacity-90",
        secondary: "border border-ink bg-transparent text-ink hover:bg-surface-sunk",
        ghost: "bg-transparent text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[52px] px-space-5",
        sm: "h-11 px-space-4",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "default", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, block, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

export { buttonVariants };
