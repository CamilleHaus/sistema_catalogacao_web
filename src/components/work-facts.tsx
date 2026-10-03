"use client";

import { useState } from "react";
import { Facts, type FactRow } from "@/components/ui";
import { DIMENSION_LABEL, formatDimension } from "@/lib/work";
import { WorkSetModal } from "@/components/work-set-modal";
import type { Work } from "@/types/domain";

export function WorkFacts({ work }: { work: Work }) {
  const [showingSet, setShowingSet] = useState(false);
  const dimension = (tipo: Work["dimensoes"][number]["tipo"]) => {
    const found = work.dimensoes.find((item) => item.tipo === tipo);
    return found ? formatDimension(found) : null;
  };

  const titulo = work.titulo ?? (
    <span className="text-ink-400">Sem título</span>
  );

  const rows: FactRow[] = [
    ["Código do acervo", work.codigoAcervo],
    ["Número manual", work.numeroManual],
    [
      "Título",
      work.serie ? (
        <>
          {titulo}, série {work.tituloSerie}
        </>
      ) : (
        titulo
      ),
    ],
    ["Edição", work.edicao],
    ["Data", work.data],
    // Só aparece em obra composta por partes; nas demais a ficha segue igual.
    ...(work.grupoObra
      ? [["Partes", work.quantidadePartes] satisfies FactRow]
      : []),
    ...(work.fichaMae
      ? [
          [
            "Conjunto",
            <div key="conjunto" className="grid justify-items-start gap-1">
              <p className="line-clamp-2">
                <span className="font-medium">{work.fichaMae.codigo}</span> ·{" "}
                {work.fichaMae.descricao}
              </p>
              <button
                type="button"
                onClick={() => setShowingSet(true)}
                className="font-medium text-primary-800 underline-offset-2 hover:underline"
              >
                Ver ficha mãe e obras do conjunto
              </button>
            </div>,
          ] satisfies FactRow,
        ]
      : []),
    ["Status", work.status?.nome],
    ["Técnica", work.tecnica?.nome],
    ["Localização", work.localizacao?.nome],
    ["Artistas", work.artistas.map((artist) => artist.nome).join(", ") || null],
    [DIMENSION_LABEL.SEM_MOLDURA, dimension("SEM_MOLDURA")],
    [DIMENSION_LABEL.COM_MOLDURA, dimension("COM_MOLDURA")],
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Ficha técnica</h2>
      <Facts rows={rows} columns={3} className="mt-4 flex-1 content-start" />
      {showingSet && work.fichaMae && (
        <WorkSetModal
          fichaMaeId={work.fichaMae.id}
          currentWorkId={work.id}
          onClose={() => setShowingSet(false)}
        />
      )}
    </section>
  );
}
