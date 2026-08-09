import { Facts, type FactRow } from "@/components/ui";
import { DIMENSION_LABEL, formatDimension } from "@/lib/work";
import type { Work } from "@/types/domain";

export function WorkFacts({ work }: { work: Work }) {
  const dimension = (tipo: Work["dimensoes"][number]["tipo"]) => {
    const found = work.dimensoes.find((item) => item.tipo === tipo);
    return found ? formatDimension(found) : null;
  };

  const rows: FactRow[] = [
    ["Código do acervo", work.codigoAcervo],
    ["Número manual", work.numeroManual],
    ["Título", work.titulo],
    ["Edição", work.edicao],
    ["Data", work.data],
    ["Status", work.status?.nome],
    ["Técnica", work.tecnica?.nome],
    ["Localização", work.localizacao?.nome],
    ["Artistas", work.artistas.map((artist) => artist.nome).join(", ") || null],
    [DIMENSION_LABEL.SEM_MOLDURA, dimension("SEM_MOLDURA")],
    [DIMENSION_LABEL.COM_MOLDURA, dimension("COM_MOLDURA")],
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Identificação</h2>
      <Facts rows={rows} columns={3} className="mt-4 flex-1 content-start" />
    </section>
  );
}
