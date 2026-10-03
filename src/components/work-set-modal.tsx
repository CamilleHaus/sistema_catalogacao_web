"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageMessage } from "@/components/page-message";
import { Button, Facts, Modal, Skeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { errorMessage, formatDimension } from "@/lib/work";
import type { WorkSetDetail } from "@/types/domain";

/** Leitura da ficha mãe a partir de uma obra do conjunto, com link para as demais. */
export function WorkSetModal({
  fichaMaeId,
  currentWorkId,
  onClose,
}: {
  fichaMaeId: string;
  currentWorkId: string;
  onClose: () => void;
}) {
  const [item, setItem] = useState<WorkSetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<WorkSetDetail>(`/fichas-mae/${fichaMaeId}`)
      .then((data) => active && setItem(data))
      .catch((caught: unknown) => active && setError(errorMessage(caught)));
    return () => {
      active = false;
    };
  }, [fichaMaeId]);

  return (
    <Modal
      title="Ficha mãe do conjunto"
      description={item ? `Código ${item.codigo}` : undefined}
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {error && <PageMessage message={error} />}
      {!item && !error && <Skeleton className="h-48" />}
      {item && (
        <div className="grid gap-5">
          {item.imagemUrl && (
            <div
              role="img"
              aria-label="Imagem da ficha mãe"
              className="h-64 w-full rounded-lg border border-border bg-surface-muted bg-contain bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${JSON.stringify(item.imagemUrl)})`,
              }}
            />
          )}
          <p className="text-sm whitespace-pre-line text-foreground">
            {item.descricao}
          </p>
          <Facts
            columns={2}
            rows={[
              ["Projeto", item.projeto.nome],
              [
                "Dimensão",
                item.dimensao ? formatDimension(item.dimensao) : null,
              ],
            ]}
          />
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Obras do conjunto ({item.obras.length})
            </h3>
            <ul className="mt-2 grid gap-1">
              {item.obras.map((obra) => (
                <li key={obra.id} className="text-sm">
                  {obra.id === currentWorkId ? (
                    <span className="text-muted-foreground">
                      {workLabel(obra)} (esta obra)
                    </span>
                  ) : (
                    <Link
                      href={`/projetos/${obra.projetoId}/obras/${obra.id}`}
                      onClick={onClose}
                      className="font-medium text-primary-800 underline-offset-2 hover:underline"
                    >
                      {workLabel(obra)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

function workLabel(obra: { codigoAcervo: string; titulo: string | null }) {
  return obra.titulo
    ? `${obra.codigoAcervo} · ${obra.titulo}`
    : obra.codigoAcervo;
}
