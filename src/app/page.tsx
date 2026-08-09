import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(107,1,1,0.45),transparent_40%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between px-6 py-8">
        <header className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Catálogo</span>
          <Link href="/login" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            Entrar
          </Link>
        </header>
        <section className="max-w-3xl py-24 sm:py-32">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-200">Organização com segurança</p>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Seus projetos, acessos e acervos em um só lugar.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
            Uma plataforma multiempresa para catalogar informações, colaborar com equipes e manter cada projeto acessível somente às pessoas certas.
          </p>
          <Link href="/login" className="mt-10 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-white hover:bg-primary-800">
            Acessar o sistema
          </Link>
        </section>
        <footer className="text-sm text-ink-500">Sistema de Catalogação</footer>
      </div>
    </main>
  );
}
