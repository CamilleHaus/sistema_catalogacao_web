import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FactRow = [label: string, value: ReactNode];

const COLUMNS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/**
 * Grade de rótulo/valor usada sempre que dados são exibidos em leitura — a
 * ficha técnica e os cards de registro das abas seguem o mesmo formato.
 */
export function Facts({
  rows,
  columns = 3,
  className,
}: {
  rows: FactRow[];
  columns?: keyof typeof COLUMNS;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", COLUMNS[columns], className)}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </dt>
          <dd className="mt-0.5 text-sm wrap-break-word text-foreground">
            {value === null || value === undefined || value === "" ? (
              <span className="text-ink-400">Não informado</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
