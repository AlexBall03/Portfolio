'use client';

import { type DragEvent, useId, useRef, useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FieldError, TextField } from '@/components/admin/form/fields';
import { sendUpload } from '@/components/admin/form/ImageUploadField';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Status } from '@/components/ui/Status';
import { Surface } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';
import type { FieldErrors, MutationResult } from '@/lib/cms/result';
import { MAX_PDF_BYTES } from '@/lib/pdf-file';
import { deleteResumeVersion, publishResumeVersion, unpublishResume, updateResumeLabel } from '../../mutations';
import { adminResumeFileHref, PUBLIC_RESUME_PATH, type ResumeAdminValues, type ResumeVersion } from '../../types';

const UPLOAD_URL = '/api/admin/resume';
const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const title = (v: ResumeVersion) => v.label ?? v.fileName;

/** A quick check before uploading; the server decides from the file's bytes. */
function checkPdfFile(file: File): string | null {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'Choose a PDF file';
  if (file.size > MAX_PDF_BYTES) return `PDFs can be at most 4 MB (this one is ${formatSize(file.size)})`;
  return null;
}

type Pending = { kind: 'publish' | 'unpublish' | 'delete'; version: ResumeVersion };

const rowAction =
  'inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-body-sm text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4';

/**
 * Resume versions: upload (never publishes), then publish any version
 * explicitly. Every action writes immediately, so there is no Save bar; each
 * result replaces the list with what the server stored.
 */
export function ResumeManager({ initial }: { initial: ResumeAdminValues }) {
  const [versions, setVersions] = useState(initial.versions);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [confirmError, setConfirmError] = useState<string>();
  const [announcement, setAnnouncement] = useState('');
  const [pending, start] = useTransition();
  const published = versions.find((v) => v.isPublished) ?? null;

  const apply = (result: MutationResult<ResumeAdminValues>, done: string) => {
    if (result.ok) {
      setVersions(result.data.versions);
      setAnnouncement(done);
      return true;
    }
    setConfirmError(Object.values(result.fieldErrors)[0] ?? result.formError ?? 'That didn’t work. Try again.');
    return false;
  };

  const run = () => {
    if (!confirm) return;
    const { kind, version } = confirm;
    start(async () => {
      const ok =
        kind === 'publish'
          ? apply(await publishResumeVersion({ id: version.id }), `${title(version)} is now the public resume.`)
          : kind === 'unpublish'
            ? apply(await unpublishResume({}), 'The resume is unpublished. The public page shows that none is available.')
            : apply(await deleteResumeVersion({ id: version.id }), `${title(version)} was deleted.`);
      if (ok) setConfirm(null);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PublishedSummary published={published} />

      <UploadPanel
        storageConfigured={initial.storageConfigured}
        onUploaded={(values) => {
          setVersions(values.versions);
          setAnnouncement('Uploaded. The new version is not public until you publish it.');
        }}
      />

      <Surface as="section" variant="raised" radius="md" aria-labelledby="versions-title">
        <header className="flex flex-col gap-1 border-b border-line px-5 py-3.5">
          <h2 id="versions-title" className="font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">
            Versions
          </h2>
          <p className="text-body-sm text-fg-muted">Newest upload first. Only the published version is public; the rest are private to you.</p>
        </header>
        {versions.length === 0 ? (
          <p className="px-5 py-10 text-center text-body-sm text-fg-muted">No versions yet. Upload the first one above.</p>
        ) : (
          <ul className="divide-y divide-line">
            {versions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                disabled={pending}
                onAction={(kind) => {
                  setConfirmError(undefined);
                  setConfirm({ kind, version: v });
                }}
                onRenamed={(values) => {
                  setVersions(values.versions);
                  setAnnouncement('Label saved.');
                }}
              />
            ))}
          </ul>
        )}
      </Surface>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <ConfirmDialog
        open={confirm?.kind === 'publish'}
        title="Publish this version?"
        confirmLabel="Publish"
        tone="default"
        pending={pending}
        error={confirmError}
        onCancel={() => setConfirm(null)}
        onConfirm={run}
      >
        <p>
          <span className="text-fg">{confirm && title(confirm.version)}</span> becomes the resume on /resume and at{' '}
          {PUBLIC_RESUME_PATH}, in both languages.
          {published && ` It replaces ${title(published)}, which stays here, private.`}
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === 'unpublish'}
        title="Unpublish the resume?"
        confirmLabel="Unpublish"
        pending={pending}
        error={confirmError}
        onCancel={() => setConfirm(null)}
        onConfirm={run}
      >
        <p>The public resume page will say no resume is available, and the download links disappear until you publish a version.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        title="Delete this version?"
        confirmLabel="Delete"
        pending={pending}
        error={confirmError}
        onCancel={() => setConfirm(null)}
        onConfirm={run}
      >
        <p>
          <span className="text-fg">{confirm && title(confirm.version)}</span> and its file are deleted permanently. This can’t
          be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function PublishedSummary({ published }: { published: ResumeVersion | null }) {
  return (
    <Surface variant="glass" radius="md" className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">Public resume</span>
        {published ? (
          <span className="truncate text-body text-fg">
            {title(published)}
            {published.publishedAt && (
              <span className="text-body-sm text-fg-faint">
                {' '}
                · published <RelativeTime iso={published.publishedAt} locale="en-US" />
              </span>
            )}
          </span>
        ) : (
          <span className="text-body text-fg-muted">None published. The public page says the resume is being updated.</span>
        )}
      </div>
      {published && (
        <a href={PUBLIC_RESUME_PATH} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
          View public PDF <Icon name="external" />
        </a>
      )}
    </Surface>
  );
}

interface VersionRowProps {
  version: ResumeVersion;
  disabled: boolean;
  onAction: (kind: Pending['kind']) => void;
  onRenamed: (values: ResumeAdminValues) => void;
}

function VersionRow({ version: v, disabled, onAction, onRenamed }: VersionRowProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(v.label ?? '');
  const [error, setError] = useState<string>();
  const [saving, startSave] = useTransition();

  const save = () =>
    startSave(async () => {
      const result = await updateResumeLabel({ id: v.id, label });
      if (result.ok) {
        setEditing(false);
        setError(undefined);
        onRenamed(result.data);
      } else {
        setError(result.fieldErrors.label ?? result.formError);
      }
    });

  return (
    <li className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {editing ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <TextField
              label="Label"
              hint="Admin only. Leave blank to show the file name."
              maxLength={120}
              value={label}
              onChange={setLabel}
              error={error}
              disabled={saving}
              className="flex-1"
            />
            <div className="flex gap-2 sm:mb-6">
              <button type="submit" disabled={saving} className={buttonStyles({ size: 'sm' })}>
                Save
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setLabel(v.label ?? '');
                  setError(undefined);
                }}
                className={buttonStyles({ variant: 'ghost', size: 'sm' })}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="truncate font-medium text-fg">{title(v)}</span>
            {v.isPublished ? <Status tone="success">Published</Status> : <Status tone="neutral">Private</Status>}
          </div>
        )}
        <span className="flex flex-wrap gap-x-2 font-mono text-micro text-fg-faint">
          <span className="truncate">{v.fileName}</span>
          <span aria-hidden="true">·</span>
          <span>{formatSize(v.sizeBytes)}</span>
          <span aria-hidden="true">·</span>
          <span title={v.uploadedAt}>
            uploaded <RelativeTime iso={v.uploadedAt} locale="en-US" />
          </span>
          {v.isPublished && v.publishedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span title={v.publishedAt}>
                published <RelativeTime iso={v.publishedAt} locale="en-US" />
              </span>
            </>
          )}
        </span>
      </div>
      <div className="-ml-2 flex flex-wrap gap-0.5 lg:ml-0 lg:justify-end">
        <a href={adminResumeFileHref(v.id)} target="_blank" rel="noopener noreferrer" className={rowAction} aria-label={`Preview ${title(v)}`}>
          <Icon name="external" /> Preview
        </a>
        <a href={adminResumeFileHref(v.id, true)} download className={rowAction} aria-label={`Download ${title(v)}`}>
          <Icon name="download" /> Download
        </a>
        {!editing && (
          <button type="button" disabled={disabled} onClick={() => setEditing(true)} className={rowAction} aria-label={`Edit the label of ${title(v)}`}>
            Label
          </button>
        )}
        {v.isPublished ? (
          <button type="button" disabled={disabled} onClick={() => onAction('unpublish')} className={rowAction}>
            Unpublish
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAction('publish')}
              className={cn(rowAction, 'font-medium text-brand-fg')}
              aria-label={`Publish ${title(v)}`}
            >
              Publish
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAction('delete')}
              className={cn(rowAction, 'hover:text-danger')}
              aria-label={`Delete ${title(v)}`}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** Upload one PDF with an optional label. It is stored privately and is not published. */
function UploadPanel({ storageConfigured, onUploaded }: { storageConfigured: boolean; onUploaded: (values: ResumeAdminValues) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const disabled = !storageConfigured || pending;

  const pick = (next: File | null | undefined) => {
    if (!next) return;
    const problem = checkPdfFile(next);
    setErrors((e) => ({ ...e, file: problem ?? '' }));
    setFormError(undefined);
    setFile(problem ? null : next);
  };

  const reset = () => {
    setFile(null);
    setLabel('');
    if (input.current) input.current.value = '';
  };

  const upload = () =>
    start(async () => {
      if (!file) return setErrors({ file: 'Choose a PDF to upload' });
      const body = new FormData();
      body.set('file', file);
      body.set('label', label);
      const result = await sendUpload<ResumeAdminValues>(UPLOAD_URL, body);
      if (result.ok) {
        onUploaded(result.data);
        reset();
        setErrors({});
        setFormError(undefined);
      } else {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
      }
    });

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (!disabled) pick(event.dataTransfer.files[0]);
  };

  return (
    <Surface as="section" variant="raised" radius="md" aria-labelledby="upload-title">
      <header className="flex flex-col gap-1 border-b border-line px-5 py-3.5">
        <h2 id="upload-title" className="font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">
          Upload a version
        </h2>
        <p className="text-body-sm text-fg-muted">
          A one-page PDF: the public page previews page 1 only. Uploading never publishes; publish it below when you’re ready.
        </p>
      </header>
      <div className="flex flex-col gap-5 px-5 py-5">
        {!storageConfigured && (
          <p className="rounded-md border border-line bg-fg/[0.03] px-3.5 py-2.5 text-body-sm text-fg-muted">
            Uploads need a private Vercel Blob store connected with the <span className="font-mono">PRIVATE_BLOB</span> prefix (see
            docs/admin-setup.md).
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <span id={`${id}-label`} className="text-body-sm font-medium text-fg">
            PDF
          </span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center gap-3 rounded-md border border-dashed px-4 py-5 text-center transition-colors sm:flex-row sm:text-left',
              dragOver ? 'border-brand bg-brand-soft/40' : errors.file ? 'border-danger' : 'border-line-strong bg-surface-inset/40',
              disabled && 'opacity-60',
            )}
          >
            <Icon name="file" className="size-5 shrink-0 text-fg-faint" />
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:items-start">
              {file ? (
                <>
                  <span className="max-w-full truncate text-body-sm text-fg">{file.name}</span>
                  <span className="font-mono text-micro text-fg-faint">{formatSize(file.size)}</span>
                </>
              ) : (
                <span className="text-body-sm text-fg-muted">Drop a PDF here, or</span>
              )}
            </div>
            <div className="flex gap-3">
              <label
                htmlFor={id}
                className={cn('cursor-pointer text-body-sm font-medium text-brand-fg hover:text-fg', disabled && 'pointer-events-none')}
              >
                {file ? 'Choose another' : 'Choose a file'}
              </label>
              {file && (
                <button type="button" disabled={disabled} onClick={reset} className="text-body-sm text-fg-muted hover:text-fg">
                  Clear
                </button>
              )}
            </div>
            <input
              ref={input}
              id={id}
              type="file"
              accept="application/pdf,.pdf"
              disabled={disabled}
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-hint`}
              aria-invalid={Boolean(errors.file) || undefined}
              onChange={(e) => pick(e.target.files?.[0])}
              className="sr-only"
            />
          </div>
          {errors.file && <FieldError>{errors.file}</FieldError>}
          <p id={`${id}-hint`} className="text-micro text-fg-faint">
            PDF, up to 4 MB. Stored privately.
          </p>
        </div>
        <TextField
          label="Label (optional)"
          hint="Admin only, e.g. “Fall 2026, internships”."
          maxLength={120}
          value={label}
          onChange={setLabel}
          error={errors.label || undefined}
          disabled={disabled}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={upload} disabled={disabled || !file} className={buttonStyles({ size: 'sm', className: 'min-w-28' })}>
            {pending && (
              <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            )}
            {pending ? 'Uploading' : 'Upload PDF'}
          </button>
          {formError && (
            <p role="alert" className="text-body-sm text-danger">
              {formError}
            </p>
          )}
        </div>
      </div>
    </Surface>
  );
}
