export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex items-center gap-3 text-sm">
        <span className="size-2 animate-pulse rounded-full bg-cyan-400" />
        Carregando sua sessão...
      </div>
    </div>
  );
}
