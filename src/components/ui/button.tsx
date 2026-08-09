import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerGhost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-xs hover:bg-primary-800 active:bg-primary-950",
  secondary:
    "border border-border-strong bg-surface text-foreground shadow-xs hover:bg-surface-muted active:bg-ink-100",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-foreground",
  danger:
    "bg-danger-600 text-white shadow-xs hover:bg-danger-700 active:bg-danger-800",
  dangerGhost: "text-danger-700 hover:bg-danger-50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base",
};

const BASE =
  "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap " +
  "transition-colors select-none " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0";

/**
 * Classes do botão sem o elemento — para aplicar em `<Link>` ou `<label>`
 * mantendo exatamente a mesma aparência.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Ícone à esquerda do rótulo. */
  icon?: ReactNode;
};

export function Button({
  variant,
  size,
  block,
  icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/** Botão só de ícone. Exige `aria-label` para continuar acessível. */
export function IconButton({
  size = "md",
  variant = "ghost",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  "aria-label": string;
}) {
  const square = { sm: "size-8", md: "size-10", lg: "size-12" }[size];
  return (
    <button
      type={type}
      className={cn(
        BASE,
        VARIANTS[variant],
        "rounded-lg",
        square,
        "px-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
