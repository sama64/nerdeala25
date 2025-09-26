"use client";

import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

const baseStyles = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary",
  secondary: "bg-success/10 text-success hover:bg-success/20 focus-visible:outline-success",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:outline-neutral-400"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={twMerge(baseStyles, variants[variant], className)}
      {...props}
    />
  )
);

Button.displayName = "Button";
