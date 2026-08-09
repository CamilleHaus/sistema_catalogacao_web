"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { SelectOption } from "./field";

/**
 * Substitui o `<select multiple>` nativo, que exige Ctrl+clique e esconde o que
 * já foi escolhido. A seleção vive em estado React e é publicada no formulário
 * por inputs ocultos, então `new FormData(form).getAll(name)` continua valendo.
 */
export function MultiSelect({
  label,
  name,
  options,
  defaultValue = [],
  hint,
  searchPlaceholder = "Buscar...",
  emptyLabel = "Nenhuma opção disponível.",
  className,
}: {
  label?: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string[];
  hint?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
  const baseId = useId();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, query]);

  const chosen = options.filter((option) => selected.includes(option.value));

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <fieldset className={cn("grid content-start gap-1.5", className)}>
      {label && (
        <legend className="mb-1.5 text-sm font-medium text-ink-700">
          {label}
        </legend>
      )}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((option) => (
            <li key={option.value}>
              <span className="inline-flex items-center gap-1 rounded-sm bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-semibold text-primary-800">
                {option.label}
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  aria-label={`Remover ${option.label}`}
                  className="grid size-4 place-items-center rounded-xs hover:bg-primary-100"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface shadow-xs">
        <div className="relative border-b border-border">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // A busca vive dentro de um <form>: sem isso, Enter submeteria tudo.
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

      <p className="text-xs text-muted-foreground">
        {hint ??
          (chosen.length === 0
            ? "Nenhum selecionado."
            : `${chosen.length} selecionado${chosen.length > 1 ? "s" : ""}.`)}
      </p>
    </fieldset>
  );
}
