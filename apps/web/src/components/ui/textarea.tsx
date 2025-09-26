"use client";

import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const baseStyles = "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={twMerge(baseStyles, className)} {...props} />
));

Textarea.displayName = "Textarea";
