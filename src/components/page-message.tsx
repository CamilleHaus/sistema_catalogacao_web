import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type MessageTone = "error" | "success" | "warning" | "info";

const TONES = {
  error: {
    box: "border-danger-200 bg-danger-50 text-danger-800",
    icon: XCircle,
  },
  success: {
    box: "border-success-100 bg-success-50 text-success-800",
    icon: CheckCircle2,
  },
  warning: {
    box: "border-warning-100 bg-warning-50 text-warning-800",
    icon: AlertTriangle,
  },
  info: {
    box: "border-border bg-surface-muted text-ink-700",
    icon: Info,
  },
} as const;

export function PageMessage({
  message,
  tone = "error",
}: {
  message: string;
  tone?: MessageTone;
}) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        box,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{message}</span>
    </div>
  );
}
