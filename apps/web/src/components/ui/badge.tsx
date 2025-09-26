import { twMerge } from "tailwind-merge";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info";
  className?: string;
}

const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-primary/10 text-primary"
};

export function Badge({ children, variant = "info", className }: BadgeProps) {
  return (
    <span className={twMerge("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", styles[variant], className)}>
      {children}
    </span>
  );
}
