import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: keyof typeof PADDING;
  /** Realce sutil no hover — use só quando o card inteiro leva a algum lugar. */
  interactive?: boolean;
};

export function Card({
  as: Tag = "div",
  padding = "md",
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-border bg-surface shadow-sm",
        PADDING[padding],
        interactive &&
          "transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Cabeçalho interno de um card: título, apoio e ações à direita. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
