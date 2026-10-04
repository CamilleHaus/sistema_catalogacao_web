"use client";

import { ChevronDown } from "lucide-react";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-lg border bg-surface text-foreground shadow-xs " +
  "placeholder:text-ink-400 transition-colors " +
  "focus:outline-none focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500";

const CONTROL_OK =
  "border-border-strong focus:border-primary-700 focus:ring-2 focus:ring-primary-700/20";
const CONTROL_ERROR =
  "border-danger-600 focus:border-danger-700 focus:ring-2 focus:ring-danger-600/20";

function controlClasses(invalid: boolean, className?: string) {
  return cn(CONTROL, invalid ? CONTROL_ERROR : CONTROL_OK, className);
}

export type FieldMeta = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Ocupa mais de uma coluna quando o formulário é em grade. */
  span?: 1 | 2 | 3 | 4;
};

const SPANS = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 xl:col-span-3",
  4: "sm:col-span-2 xl:col-span-4",
} as const;

/** Rótulo, controle, dica e erro — a moldura compartilhada por todos os campos. */
export function FieldShell({
  label,
  hint,
  error,
  span = 1,
  htmlFor,
  hintId,
  errorId,
  children,
}: FieldMeta & {
  htmlFor: string;
  hintId: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", SPANS[span])}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-ink-700 empty:hidden"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function useFieldIds(
  id: string | undefined,
  hint: unknown,
  error: unknown,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  return {
    fieldId,
    hintId: `${fieldId}-hint`,
    errorId: `${fieldId}-error`,
    describedBy:
      [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldMeta;

export function Input({
  label,
  hint,
  error,
  span,
  id,
  className,
  ...props
}: InputProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      span={span}
      htmlFor={ids.fieldId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <input
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(controlClasses(Boolean(error), className), "h-10 px-3")}
        {...props}
      />
    </FieldShell>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldMeta;

export function Textarea({
  label,
  hint,
  error,
  span,
  id,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      span={span}
      htmlFor={ids.fieldId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <textarea
        id={ids.fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(
          controlClasses(Boolean(error), className),
          "resize-y px-3 py-2",
        )}
        {...props}
      />
    </FieldShell>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  /** Opções seguidas com o mesmo grupo viram um `<optgroup>`. */
  group?: string;
};

/** Junta opções consecutivas do mesmo grupo; sem grupo, ficam soltas. */
function groupOptions(options: SelectOption[]) {
  const groups: { label?: string; options: SelectOption[] }[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (last && last.label === option.group) last.options.push(option);
    else groups.push({ label: option.group, options: [option] });
  }
  return groups;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldMeta & {
    options: SelectOption[];
    /** Texto da opção vazia. Passe `null` para um select obrigatório sem vazio. */
    placeholder?: string | null;
  };

export function Select({
  label,
  hint,
  error,
  span,
  id,
  className,
  options,
  placeholder = "Selecione",
  multiple,
  ...props
}: SelectProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      span={span}
      htmlFor={ids.fieldId}
      hintId={ids.hintId}
      errorId={ids.errorId}
    >
      <div className="relative">
        <select
          id={ids.fieldId}
          multiple={multiple}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(
            controlClasses(Boolean(error), className),
            multiple
              ? "min-h-28 px-3 py-2"
              : "h-10 appearance-none py-0 pr-9 pl-3",
          )}
          {...props}
        >
          {!multiple && placeholder !== null && (
            <option value="">{placeholder}</option>
          )}
          {groupOptions(options).map((group, index) => {
            const items = group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ));
            return group.label ? (
              <optgroup key={`${group.label}-${index}`} label={group.label}>
                {items}
              </optgroup>
            ) : (
              items
            );
          })}
        </select>
        {!multiple && (
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500"
          />
        )}
      </div>
    </FieldShell>
  );
}
