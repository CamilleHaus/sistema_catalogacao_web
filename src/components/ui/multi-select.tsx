"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { SelectOption } from "./field";

/**
 * Substitui o `<select multiple>` nativo, que exige Ctrl+clique e esconde o que
 * já foi escolhido. Fechado, cabe numa linha só (como um `Select`); clicar abre
 * um painel com busca + checklist. A seleção vive em estado React e é
 * publicada no formulário por inputs ocultos, então
 * `new FormData(form).getAll(name)` continua valendo.
 */
export function MultiSelect({
  label,
  name,
  options,
  defaultValue = [],
  value,
  onChange,
  hint,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhuma opção disponível.",
  className,
}: {
  label?: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string[];
  /** Modo controlado: quem chama guarda a seleção (fora de um `<form>`). */
  value?: string[];
  onChange?: (value: string[]) => void;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const selected = value ?? internal;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, query]);

  const chosen = options.filter((option) => selected.includes(option.value));

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    setInternal(next);
    onChange?.(next);
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative grid content-start gap-1.5", className)}
    >
      {label && <p className="text-sm font-medium text-ink-700">{label}</p>}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={label ? undefined : placeholder}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm shadow-xs outline-none focus-visible:border-primary-700 focus-visible:ring-2 focus-visible:ring-primary-700/20"
      >
        <span
          className={cn(
            "truncate text-left",
            chosen.length === 0 && "text-ink-400",
          )}
        >
          {chosen.length === 0
            ? placeholder
            : chosen.map((option) => option.label).join(", ")}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-ink-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg">
          <div className="relative border-b border-border">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // O painel vive dentro de um <form>: sem isso, Enter submeteria tudo.
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={searchPlaceholder}
              aria-label={label ? `Buscar em ${label}` : searchPlaceholder}
              className="h-9 w-full bg-transparent pr-3 pl-8 text-sm outline-none placeholder:text-ink-400"
            />
          </div>

          <div className="max-h-44 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                {query.trim() ? "Nenhum resultado." : emptyLabel}
              </p>
            ) : (
              filtered.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    htmlFor={`${baseId}-${option.value}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                      checked ? "bg-primary-50 text-primary-900" : "hover:bg-ink-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      id={`${baseId}-${option.value}`}
                      checked={checked}
                      onChange={() => toggle(option.value)}
                      className="size-4 shrink-0 accent-primary-800"
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
