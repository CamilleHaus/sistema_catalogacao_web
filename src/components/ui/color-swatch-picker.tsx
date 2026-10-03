"use client";

import { Check, Pipette } from "lucide-react";
import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const COLOR_SWATCH_PALETTE = [
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#65A30D",
  "#16A34A",
  "#059669",
  "#0D9488",
  "#0891B2",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#C026D3",
  "#DB2777",
  "#57534E",
];

/** Seletor de cor por paleta fixa, com opção "sem cor" e cor personalizada via input nativo. */
export function ColorSwatchPicker({
  label,
  value,
  onChange,
  allowNone = true,
}: {
  label?: ReactNode;
  value: string | null;
  onChange: (value: string | null) => void;
  allowNone?: boolean;
}) {
  const customRef = useRef<HTMLInputElement>(null);
  const isCustom = value !== null && !COLOR_SWATCH_PALETTE.includes(value);

  return (
    <div className="grid gap-1.5">
      {label && <p className="text-sm font-medium text-ink-700">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {allowNone && (
          <Swatch
            selected={value === null}
            aria-label="Sem cor"
            onClick={() => onChange(null)}
            className="border border-dashed border-border-strong bg-surface"
          />
        )}
        {COLOR_SWATCH_PALETTE.map((hex) => (
          <Swatch
            key={hex}
            color={hex}
            selected={value === hex}
            aria-label={`Usar cor ${hex}`}
            onClick={() => onChange(hex)}
          />
        ))}
        <Swatch
          selected={isCustom}
          color={isCustom ? value : undefined}
          aria-label="Escolher cor personalizada"
          onClick={() => customRef.current?.click()}
          className={
            isCustom
              ? undefined
              : "border border-border-strong bg-surface text-ink-500"
          }
        >
          {!isCustom && <Pipette aria-hidden className="size-3.5" />}
        </Swatch>
        <input
          ref={customRef}
          type="color"
          value={isCustom ? value : "#6b0101"}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Swatch({
  color,
  selected,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: string;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:scale-105",
        selected && "ring-2 ring-primary-700 ring-offset-2 ring-offset-surface",
        className,
      )}
      {...props}
    >
      {selected && color && (
        <Check aria-hidden className="size-4 text-white drop-shadow" />
      )}
      {children}
    </button>
  );
}
