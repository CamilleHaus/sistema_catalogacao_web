import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton } from "./button";
import { Facts, type FactRow } from "./facts";

/**
 * Um registro exibido em leitura, no mesmo formato da ficha técnica: título,
 * grade de dados e um botão de editar que abre modal. Nada de formulário
 * aberto na página.
 */
export function RecordCard({
  title,
  meta,
  rows,
  columns = 3,
  extra,
  onEdit,
  onDelete,
  busy = false,
}: {
  title: ReactNode;
  meta?: ReactNode;
  rows: FactRow[];
  columns?: 1 | 2 | 3 | 4;
  /** Conteúdo extra abaixo da grade (galerias, links, anexos). */
  extra?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h4>
          {meta && (
            <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                icon={<Pencil className="size-4" />}
                onClick={onEdit}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <IconButton
                aria-label="Excluir registro"
                size="sm"
                variant="dangerGhost"
                disabled={busy}
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <Facts rows={rows} columns={columns} className="mt-4" />
      )}

      {extra && (
        <div className="mt-4 border-t border-border pt-4">{extra}</div>
      )}
    </article>
  );
}
