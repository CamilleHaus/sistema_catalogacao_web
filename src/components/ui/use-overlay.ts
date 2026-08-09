"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Nunca notifica: o valor só muda de servidor para cliente. */
const neverChanges = () => () => {};

/**
 * Comportamento compartilhado por Modal e Drawer: trava a rolagem do fundo,
 * fecha no Escape, prende o Tab dentro do painel e devolve o foco ao sair.
 *
 * Retorna `false` até o primeiro efeito rodar, para o portal só montar no
 * cliente e não quebrar a hidratação.
 */
export function useOverlay(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();
    else panel?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current.contains(active);

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose, panelRef]);

  return mounted;
}
