import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "./button";
import { SectionHeader } from "./page-header";

/**
 * Cabeçalho + botão de adicionar + lista (ou estado vazio). É a moldura de
 * toda subaba do dossiê da obra.
 */
export function RecordSection({
  title,
  description,
  icon,
  addLabel = "Adicionar",
  canAdd = false,
  onAdd,
  isEmpty,
  emptyText,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  addLabel?: string;
  canAdd?: boolean;
  onAdd?: () => void;
  isEmpty: boolean;
  emptyText: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <SectionHeader
        title={title}
        description={description}
        actions={
          canAdd &&
          onAdd && (
            <Button size="sm" icon={<Plus className="size-4" />} onClick={onAdd}>
              {addLabel}
            </Button>
          )
        }
      />
      <div className="mt-4 grid gap-4">
        {isEmpty ? (
          <EmptyState icon={icon} title="Nenhum registro">
            {emptyText}
          </EmptyState>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
