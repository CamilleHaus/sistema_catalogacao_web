import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
  backRowActions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Conteúdo à direita, na mesma linha do link de voltar (em vez de ao lado do título). */
  backRowActions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref && (
        <div className="flex items-center justify-between gap-4">
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-ink-500 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
          {backRowActions}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-wider text-primary-700 uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/** Divisor de seção dentro de uma página, com contagem opcional à direita. */
export function SectionHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {meta && (
            <span className="rounded-sm bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
              {meta}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
