import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-medium",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded-xs border-border-strong accent-primary-800"
        {...props}
      />
      {label}
    </label>
  );
}
