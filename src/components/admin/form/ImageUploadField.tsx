'use client';

import { type DragEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { MutationResult } from '@/lib/cms/result';
import { IMAGE_TYPES, type ImageMimeType, MAX_IMAGE_BYTES } from '@/lib/image-file';
import { FieldError } from './fields';

const ALL_TYPES = Object.keys(IMAGE_TYPES) as ImageMimeType[];
const LABELS: Record<ImageMimeType, string> = { 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/avif': 'AVIF' };

/** "JPEG, PNG, WebP, or AVIF" */
const formatList = (types: readonly ImageMimeType[]) => {
  const names = types.map((t) => LABELS[t]);
  return names.length < 3 ? names.join(' or ') : `${names.slice(0, -1).join(', ')}, or ${names.at(-1)}`;
};
const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * A quick check before uploading, so an obviously wrong file fails instantly.
 * The server decides from the file's bytes; this only reads what the browser reports.
 */
export function checkImageFile(file: File, types: readonly ImageMimeType[] = ALL_TYPES): string | null {
  if (!(types as readonly string[]).includes(file.type)) return `Use a ${formatList(types)} image`;
  if (file.size > MAX_IMAGE_BYTES) return `Images can be at most 4 MB (this one is ${formatSize(file.size)})`;
  return null;
}

/**
 * Sends a multipart form to an admin upload Route Handler and reads its
 * `MutationResult`. Network failures and non-JSON answers become a form error.
 */
export async function sendUpload<T>(url: string, body: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<MutationResult<T>> {
  try {
    const response = await fetch(url, { method, body, credentials: 'same-origin' });
    const result = (await response.json()) as MutationResult<T>;
    if (typeof result === 'object' && result !== null && 'ok' in result) return result;
  } catch {
    // Fall through to the generic message.
  }
  return { ok: false, fieldErrors: {}, formError: 'The upload could not be completed. Check your connection and try again.' };
}

interface ImageUploadFieldProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
  hint?: string;
  /** Accepted formats (default: every supported image type). */
  types?: readonly ImageMimeType[];
}

/**
 * Choose or drop one image, with a local preview before anything is sent.
 * Reusable by any editor that uploads a single image.
 */
export function ImageUploadField({ label, file, onChange, error, disabled, hint, types = ALL_TYPES }: ImageUploadFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);
  // Cleared from outside (after an upload): reset the native input so the same file can be picked again.
  useEffect(() => {
    if (!file && input.current) input.current.value = '';
  }, [file]);

  const pick = (next: File | null | undefined) => {
    if (!next) return;
    const problem = checkImageFile(next, types);
    setLocalError(problem);
    onChange(problem ? null : next);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (!disabled) pick(event.dataTransfer.files[0]);
  };

  const shownError = localError ?? error;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-body-sm font-medium text-fg">
        {label}
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-4 rounded-md border border-dashed px-4 py-5 transition-colors sm:flex-row',
          dragOver ? 'border-brand bg-brand-soft/40' : shownError ? 'border-danger' : 'border-line-strong bg-surface-inset/40',
          disabled && 'opacity-60',
        )}
      >
        <div className="relative grid aspect-[16/10] w-40 shrink-0 place-items-center overflow-hidden rounded-sm border border-line bg-surface-inset">
          {preview ? (
            // A local object URL: next/image can't optimize it, and doesn't need to.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="absolute inset-0 size-full object-cover object-top" />
          ) : (
            <Icon name="download" className="size-5 text-fg-faint" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center sm:items-start sm:text-left">
          {file ? (
            <>
              <span className="max-w-full truncate text-body-sm text-fg">{file.name}</span>
              <span className="font-mono text-micro text-fg-faint">{formatSize(file.size)}</span>
            </>
          ) : (
            <span className="text-body-sm text-fg-muted">Drop an image here, or</span>
          )}
          <div className="flex gap-3">
            <label
              htmlFor={id}
              className={cn('cursor-pointer text-body-sm font-medium text-brand-fg hover:text-fg', disabled && 'pointer-events-none')}
            >
              {file ? 'Choose another' : 'Choose a file'}
            </label>
            {file && (
              <button type="button" disabled={disabled} onClick={() => onChange(null)} className="text-body-sm text-fg-muted hover:text-fg">
                Clear
              </button>
            )}
          </div>
          <input
            ref={input}
            id={id}
            type="file"
            accept={types.join(',')}
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-hint`}
            aria-invalid={Boolean(shownError) || undefined}
            onChange={(e) => pick(e.target.files?.[0])}
            className="sr-only"
          />
        </div>
      </div>
      {shownError && <FieldError>{shownError}</FieldError>}
      <p id={`${id}-hint`} className="text-micro text-fg-faint">
        {hint ?? `${formatList(types)}, up to 4 MB.`}
      </p>
    </div>
  );
}
