import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  action,
  children,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  /** Botão ou link para a próxima ação óbvia. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-ink-100 text-ink-500">
        <Icon aria-hidden className="size-5" />
      </span>
      {title && (
        <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      )}
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
