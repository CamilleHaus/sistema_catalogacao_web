"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";
import { useOverlay } from "./use-overlay";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export function Modal({
  title,
  description,
  size = "md",
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  onClose: () => void;
  /** Barra de ações fixa no rodapé; o corpo rola por baixo dela. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const mounted = useOverlay(panelRef, onClose);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-[overlay-in_150ms_ease-out] items-end justify-center overflow-y-auto bg-ink-950/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "flex max-h-[92dvh] w-full animate-[modal-in_180ms_ease-out] flex-col rounded-t-2xl bg-surface shadow-2xl outline-none sm:rounded-2xl",
          SIZES[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <IconButton aria-label="Fechar" size="sm" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <footer className="flex justify-end gap-3 border-t border-border bg-surface-muted px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
