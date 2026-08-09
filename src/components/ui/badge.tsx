import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-primary-50 text-primary-800",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  outline: "border border-border-strong text-ink-600",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        "[&_svg]:size-3 [&_svg]:shrink-0",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Pontinho colorido + texto, para status em listas densas. */
export function StatusDot({
  tone = "neutral",
  children,
}: {
  tone?: Exclude<BadgeTone, "outline">;
  children: ReactNode;
}) {
  const dot = {
    neutral: "bg-ink-400",
    brand: "bg-primary-700",
    success: "bg-success-600",
    warning: "bg-warning-600",
    danger: "bg-danger-600",
  }[tone];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}
