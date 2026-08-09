export function LoadingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-background text-ink-600"
    >
      <div className="flex items-center gap-3 text-sm font-medium">
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-ink-300 border-t-primary"
        />
        Carregando sua sessão...
      </div>
    </div>
  );
}
