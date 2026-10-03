"use client";

import { ImageOff } from "lucide-react";
import Link from "next/link";
import { StatusDot } from "@/components/ui";
import { workTitle } from "@/lib/work";
import type { Work } from "@/types/domain";

export function WorkCard({ work, href }: { work: Work; href: string }) {
  const artists = work.artistas.map((artist) => artist.nome).join(", ");
  const title = work.data
    ? `${workTitle(work)}, ${work.data}`
    : workTitle(work);

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
            {title}
          </Link>
        </h3>

        {artists && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {artists}
          </p>
        )}

        {work.tecnica && (
          <p className="text-sm text-ink-600">{work.tecnica.nome}</p>
        )}

        {(work.status || work.localizacao) && (
          <dl className="mt-auto flex flex-col gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
            {work.status && (
              <div>
                <dt className="sr-only">Status</dt>
                <dd>
                  <StatusDot tone="brand">{work.status.nome}</StatusDot>
                </dd>
              </div>
            )}
            {work.localizacao && (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Localização</dt>
                <dd className="truncate">{work.localizacao.nome}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </article>
  );
}
