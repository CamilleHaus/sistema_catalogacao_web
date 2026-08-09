"use client";

import type { LucideIcon } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Contador à direita do rótulo (ex.: quantidade de anexos). */
  count?: number;
  content: ReactNode;
};

export function Tabs({
  items,
  value,
  onChange,
  className,
  variant = "primary",
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /**
   * `nested` desenha as abas dentro de um painel com borda, deixando claro que
   * elas pertencem à aba principal selecionada acima.
   */
  variant?: "primary" | "nested";
}) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const active = items.find((item) => item.id === value) ?? items[0];
  const nested = variant === "nested";

  // Setas navegam entre abas, como manda o padrão de tablist.
  function onKeyDown(event: React.KeyboardEvent) {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = items.findIndex((item) => item.id === active.id);
    const next = items[(index + offset + items.length) % items.length];
    onChange(next.id);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)
      ?.focus();
  }

  return (
    <div
      className={cn(
        nested && "overflow-hidden rounded-lg border border-border",
        className,
      )}
    >
      {/* A linha divisória fica neste invólucro, e não na faixa que rola: a
          faixa usa -mb-px para que o indicador da aba ativa cubra a linha. */}
      <div
        className={cn(
          "border-b border-border",
          nested && "bg-surface-muted",
        )}
      >
        <div
          ref={listRef}
          role="tablist"
          onKeyDown={onKeyDown}
          // Sem `overflow` aqui de propósito. O conjunto de abas é fixo e
          // pequeno, então elas quebram em linha quando falta largura. Usar
          // overflow-x fazia o overflow-y virar `auto` por especificação, e o
          // -mb-px dos botões bastava para aparecer uma barra vertical.
          className={cn(
            "-mb-px flex flex-wrap items-stretch gap-1",
            nested && "px-1",
          )}
        >
          {items.map((item) => {
            const selected = item.id === active.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                data-tab={item.id}
                id={`${baseId}-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  nested ? "h-10" : "h-11",
                  selected
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-500 hover:border-border-strong hover:text-foreground",
                )}
              >
                {Icon && <Icon aria-hidden className="size-4" />}
                {item.label}
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-sm px-1.5 text-xs font-semibold tabular-nums",
                      selected
                        ? "bg-primary-50 text-primary-800"
                        : "bg-ink-100 text-ink-600",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
        className={cn("focus-visible:outline-none", nested && "p-4")}
      >
        {active.content}
      </div>
    </div>
  );
}
