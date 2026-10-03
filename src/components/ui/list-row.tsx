import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

/** Moldura de uma listagem densa e padronizada: borda única, linhas divididas. */
export function RowList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {children}
    </ul>
  );
}

/** Uma linha de `RowList`: título + detalhe à esquerda, metadados + editar à direita. */
export function ListRow({
  leading,
  title,
  detail,
  meta,
  onEdit,
  busy = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  onEdit?: () => void;
  busy?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>
          {detail && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {detail}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta}
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            icon={<Pencil className="size-3.5" />}
            onClick={onEdit}
          >
            Editar
          </Button>
        )}
      </div>
    </li>
  );
}
