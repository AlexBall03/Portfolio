'use client';

import { type ReactNode, useId } from 'react';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { cn } from '@/lib/cn';

/**
 * Admin form fields. Each one wires its label, hint, and error to the control
 * (`aria-describedby`, `aria-invalid`), so screen readers announce what is
 * wrong where it is wrong. Values are controlled by the editor (`useEditor`).
 */

export const CONTROL =
  'w-full rounded-md border border-line-strong bg-surface-inset/70 px-3.5 py-2.5 text-body-sm text-fg transition-[border-color,box-shadow,background-color] placeholder:text-fg-faint ' +
  'hover:border-fg/25 focus:border-brand focus:bg-surface-inset focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--focus)_18%,transparent)] focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_18%,transparent)]';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Shown beside the label, e.g. a character count. */
  aside?: ReactNode;
  className?: string;
  children: (control: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, aside, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-body-sm font-medium text-fg">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="text-micro text-fg-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-body-sm text-danger">
      <Icon name="alert" className="size-4 shrink-0" />
      {children}
    </p>
  );
}

interface TextFieldProps extends Omit<FieldProps, 'children' | 'aside'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: 'text' | 'email' | 'number';
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'decimal';
}

/** Text input or textarea; shows a counter once a `maxLength` is near. */
export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  multiline,
  rows = 3,
  disabled,
  autoComplete = 'off',
  inputMode,
  ...field
}: TextFieldProps) {
  const near = maxLength !== undefined && value.length > maxLength * 0.8;
  const aside = near ? (
    <span className={cn('font-mono text-micro tabular-nums', value.length > maxLength ? 'text-danger' : 'text-fg-faint')}>
      {value.length}/{maxLength}
    </span>
  ) : null;
  return (
    <Field {...field} aside={aside}>
      {({ id, describedBy, invalid }) => {
        const common = {
          id,
          value,
          placeholder,
          disabled,
          'aria-describedby': describedBy,
          'aria-invalid': invalid || undefined,
        };
        return multiline ? (
          <textarea
            {...common}
            rows={rows}
            className={cn(CONTROL, 'resize-y leading-relaxed')}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            {...common}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            className={CONTROL}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    </Field>
  );
}

interface SelectFieldProps<T extends string> extends Omit<FieldProps, 'children' | 'aside'> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SelectField<T extends string>({ value, options, onChange, disabled, ...field }: SelectFieldProps<T>) {
  return (
    <Field {...field}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL, 'appearance-none bg-[length:0] pr-8')}
          // The options list is closed, so the cast only narrows the DOM's string back to T.
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** On/off setting: a `role="switch"` button with its label beside it. */
export function SwitchField({ label, checked, onChange, hint, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200 ease-standard',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface-inset',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-4.5 rounded-full bg-canvas shadow-sm transition-[translate] duration-200 ease-standard',
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
          )}
        />
      </button>
      <span className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-body-sm font-medium text-fg">
          {label}
        </label>
        {hint && (
          <span id={`${id}-hint`} className="text-micro text-fg-faint">
            {hint}
          </span>
        )}
      </span>
    </div>
  );
}

interface StringListFieldProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Per-entry error, by index. */
  errorAt: (index: number) => string | undefined;
  /** Error for the list as a whole (e.g. "Add at least one paragraph"). */
  error?: string;
  /** Per-entry placeholder (e.g. the English text on the Spanish tab). */
  placeholderAt?: (index: number) => string | undefined;
  itemLabel: (index: number) => string;
  addLabel: string;
  max?: number;
  multiline?: boolean;
  maxLength?: number;
  hint?: ReactNode;
  disabled?: boolean;
}

/** An ordered list of strings (paragraphs, chips): edit, add, remove, reorder. */
export function StringListField({
  label,
  values,
  onChange,
  errorAt,
  error,
  placeholderAt,
  itemLabel,
  addLabel,
  max,
  multiline,
  maxLength,
  hint,
  disabled,
}: StringListFieldProps) {
  const replace = (i: number, value: string) => onChange(values.map((v, j) => (j === i ? value : v)));
  const move = (i: number, to: number) => {
    const next = [...values];
    const [item] = next.splice(i, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-body-sm font-medium text-fg">{label}</legend>
      {hint && <p className="-mt-2 text-micro text-fg-faint">{hint}</p>}
      {values.map((value, i) => (
        <div key={i} className="flex items-start gap-2">
          <TextField
            label={itemLabel(i)}
            value={value}
            onChange={(v) => replace(i, v)}
            error={errorAt(i)}
            placeholder={placeholderAt?.(i)}
            multiline={multiline}
            rows={multiline ? 4 : undefined}
            maxLength={maxLength}
            disabled={disabled}
            className="flex-1"
          />
          <ItemControls
            className="mt-7"
            label={itemLabel(i)}
            index={i}
            count={values.length}
            onMove={move}
            onRemove={() => onChange(values.filter((_, j) => j !== i))}
            disabled={disabled}
          />
        </div>
      ))}
      {error && <FieldError>{error}</FieldError>}
      {(max === undefined || values.length < max) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...values, ''])}
          className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'self-start' })}
        >
          {addLabel}
        </button>
      )}
    </fieldset>
  );
}

interface ItemControlsProps {
  /** What the item is called, for the buttons' accessible names. */
  label: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  /** Omitted for lists that can only be reordered. */
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

const iconButton =
  'grid size-8 place-items-center rounded-sm text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4';

/** Move up / move down / remove: plain buttons, so reordering works from the keyboard. */
export function ItemControls({ label, index, count, onMove, onRemove, disabled, className }: ItemControlsProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <Icon name="arrowDown" className="rotate-180" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${label} down`}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <Icon name="arrowDown" />
      </button>
      {onRemove && (
        <button
          type="button"
          className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}
          aria-label={`Remove ${label}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}
