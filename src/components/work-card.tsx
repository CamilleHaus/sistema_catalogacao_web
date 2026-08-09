"use client";

import { ImageOff, MapPin, Ruler } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatDimension } from "@/lib/work";
import type { Work } from "@/types/domain";

export function WorkCard({ work, href }: { work: Work; href: string }) {
  const artists = work.artistas.map((artist) => artist.nome).join(", ");
  const dimension = work.dimensoes[0];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all focus-within:border-primary-700 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div className="relative aspect-4/3 shrink-0 overflow-hidden bg-ink-100">
        {work.fotoPrincipalUrl ? (
          <div
            role="img"
            aria-label={`Foto principal de ${work.tituloExibicao}`}
            className="size-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
            style={{
              backgroundImage: `url(${JSON.stringify(work.fotoPrincipalUrl)})`,
            }}
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-400">
            <ImageOff aria-hidden className="size-7" />
            <span className="sr-only">Obra sem foto principal</span>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 rounded-md bg-ink-950/75 px-2 py-1 font-mono text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
          {work.codigoAcervo}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3 className="text-base leading-snug font-semibold text-balance text-foreground">
          {/* O ::after estica a área de clique por todo o card sem envolver o
              card inteiro em um link. */}
          <Link
            href={href}
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {work.tituloExibicao}
          </Link>
        </h3>

        {artists && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{artists}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {work.status && <Badge tone="brand">{work.status.nome}</Badge>}
          {work.tecnica && <Badge tone="outline">{work.tecnica.nome}</Badge>}
          {work.data && <Badge tone="neutral">{work.data}</Badge>}
        </div>

        {(work.localizacao || dimension) && (
          <dl className="flex flex-col gap-1 border-t border-border pt-2.5 text-xs text-muted-foreground">
            {work.localizacao && (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Localização</dt>
                <MapPin aria-hidden className="size-3.5 shrink-0" />
                <dd className="truncate">{work.localizacao.nome}</dd>
              </div>
            )}
            {dimension && (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Dimensões</dt>
                <Ruler aria-hidden className="size-3.5 shrink-0" />
                <dd className="truncate">{formatDimension(dimension)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </article>
  );
}
