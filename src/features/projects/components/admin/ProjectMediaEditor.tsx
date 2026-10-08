'use client';

import Image from 'next/image';
import { useId, useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, TextField } from '@/components/admin/form/fields';
import { checkImageFile, ImageUploadField, sendUpload } from '@/components/admin/form/ImageUploadField';
import { LocaleTabs, TranslationBadge } from '@/components/admin/form/LocaleTabs';
import { SortableList } from '@/components/admin/form/SortableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { Surface } from '@/components/ui/Surface';
import { DEFAULT_LOCALE, LOCALE_TAGS, LOCALES, type Locale } from '@/i18n/config';
import { cn } from '@/lib/cn';
import { errorsByLocale, localeStatuses, translationStatus } from '@/lib/cms/locale';
import type { FieldErrors } from '@/lib/cms/result';
import { saveProjectMedia } from '../../mutations';
import { mediaTranslationInput } from '../../schema';
import type { ProjectMediaItemValues, ProjectMediaValues } from '../../types';

const mediaUrl = (projectId: string, assetId?: string) =>
  `/api/admin/projects/${projectId}/media${assetId ? `/${assetId}` : ''}`;

interface ProjectMediaEditorProps {
  projectId: string;
  initial: ProjectMediaValues;
  /** Whether the Blob store is connected in this environment. */
  storageConfigured: boolean;
}

/**
 * A project's images. Uploading and replacing a file happen immediately
 * (bytes can't wait for Save); order, the hero choice, alt text, captions and
 * removals are edits saved together with Save (Discard undoes them).
 */
export function ProjectMediaEditor({ projectId, initial, storageConfigured }: ProjectMediaEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectMedia({ projectId, ...values }));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [removing, setRemoving] = useState<number | null>(null);
  const [replaceError, setReplaceError] = useState<{ key: string; message: string } | null>(null);
  const [replacing, startReplace] = useTransition();
  const items = editor.values.items;
  const fileOps = storageConfigured && !editor.dirty && !editor.pending;

  const setItems = (next: ProjectMediaItemValues[]) => editor.update((v) => ({ ...v, items: next }), ['items']);

  const replace = (item: ProjectMediaItemValues, file: File | undefined) => {
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return setReplaceError({ key: item.key, message: problem });
    setReplaceError(null);
    startReplace(async () => {
      const body = new FormData();
      body.set('file', file);
      const result = await sendUpload<ProjectMediaValues>(mediaUrl(projectId, item.assetId), body, 'PUT');
      if (result.ok) editor.reset(result.data);
      else setReplaceError({ key: item.key, message: result.fieldErrors.file ?? result.formError ?? 'Replacing failed.' });
    });
  };

  return (
    <>
      <UploadPanel
        projectId={projectId}
        disabled={!fileOps}
        reason={
          !storageConfigured
            ? 'Uploads need Vercel Blob: connect a Blob store to this project (see docs/admin-setup.md).'
            : editor.dirty
              ? 'Save or discard your changes below before uploading.'
              : undefined
        }
        onUploaded={editor.reset}
      />

      <EditorForm editor={editor} label="Project images" savedNote="images updated">
        <EditorSection
          title="Images"
          description="The hero image fronts the project's card and page; the others form its gallery, in this order."
        >
          <LocaleTabs
            active={locale}
            onChange={setLocale}
            status={localeStatuses(mediaTranslationInput, items.map((i) => i.translations))}
            errorCount={errorsByLocale(editor.errors)}
          >
            <SortableList
              items={items}
              onChange={setItems}
              itemLabel={(item, i) => item.translations.en.alt || `image ${i + 1}`}
              onRemove={setRemoving}
              disabled={editor.pending}
              emptyLabel="No images yet. Upload one above; the first becomes the hero."
            >
              {(item, i) => (
                <div className="grid w-full gap-4 py-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
                  <div className="flex flex-col gap-2">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line bg-surface-inset">
                      <Image src={item.src} alt="" fill sizes="176px" className="object-cover object-top" />
                    </div>
                    <span className="font-mono text-micro text-fg-faint">
                      {item.width && item.height ? `${item.width} × ${item.height}` : 'Size unknown'}
                    </span>
                    <label className="flex cursor-pointer items-center gap-2 text-body-sm text-fg">
                      <input
                        type="radio"
                        name={`${projectId}-hero`}
                        checked={item.isCover}
                        onChange={() => setItems(items.map((x, j) => ({ ...x, isCover: j === i })))}
                        className="accent-[var(--brand)]"
                      />
                      Hero image
                    </label>
                    <ReplaceButton
                      label={item.translations.en.alt || `image ${i + 1}`}
                      disabled={!fileOps || replacing}
                      onFile={(file) => replace(item, file)}
                    />
                    {replaceError?.key === item.key && <FieldError>{replaceError.message}</FieldError>}
                  </div>
                  <div className="flex min-w-0 flex-col gap-4">
                    <TranslationBadge locale={locale} status={translationStatus(mediaTranslationInput, item.translations[locale])} />
                    <TextField
                      label="Alt text"
                      hint="What the image shows, for people who can't see it."
                      maxLength={300}
                      placeholder={locale === DEFAULT_LOCALE ? undefined : item.translations.en.alt}
                      {...editor.text(['items', i, 'translations', locale, 'alt'])}
                    />
                    <TextField
                      label="Caption (optional)"
                      maxLength={300}
                      placeholder={locale === DEFAULT_LOCALE ? undefined : item.translations.en.caption}
                      {...editor.text(['items', i, 'translations', locale, 'caption'])}
                    />
                  </div>
                </div>
              )}
            </SortableList>
            {editor.errorFor(['items']) && <FieldError>{editor.errorFor(['items'])}</FieldError>}
          </LocaleTabs>
        </EditorSection>
      </EditorForm>

      <ConfirmDialog
        open={removing !== null}
        title="Remove image?"
        confirmLabel="Remove"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing !== null) setItems(items.filter((_, j) => j !== removing));
          setRemoving(null);
        }}
      >
        <p>
          The image is deleted when you save. Until then, Discard brings it back.
          {removing !== null && items[removing]?.isCover && ' It is the hero image: choose another one before saving.'}
        </p>
      </ConfirmDialog>
    </>
  );
}

function ReplaceButton({ label, disabled, onFile }: { label: string; disabled: boolean; onFile: (file: File | undefined) => void }) {
  const id = useId();
  return (
    <>
      <label
        htmlFor={id}
        className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }), 'cursor-pointer', disabled && 'pointer-events-none opacity-60')}
        aria-disabled={disabled || undefined}
      >
        Replace file
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={disabled}
        aria-label={`Replace the file of ${label}`}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="sr-only"
      />
    </>
  );
}

const blankMeta = () => Object.fromEntries(LOCALES.map((l) => [l, { alt: '', caption: '' }])) as Record<Locale, { alt: string; caption: string }>;

interface UploadPanelProps {
  projectId: string;
  disabled: boolean;
  reason?: string;
  onUploaded: (values: ProjectMediaValues) => void;
}

/** Upload one image with its alt text. It is stored and attached immediately. */
function UploadPanel({ projectId, disabled, reason, onUploaded }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState(blankMeta);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const upload = () =>
    start(async () => {
      if (!file) return setErrors({ file: 'Choose an image to upload' });
      const body = new FormData();
      body.set('file', file);
      for (const l of LOCALES) {
        body.set(`alt.${l}`, meta[l].alt);
        body.set(`caption.${l}`, meta[l].caption);
      }
      const result = await sendUpload<ProjectMediaValues>(mediaUrl(projectId), body);
      if (result.ok) {
        onUploaded(result.data);
        setFile(null);
        setMeta(blankMeta());
        setErrors({});
        setFormError(undefined);
        setDone(true);
      } else {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
      }
    });

  const field = (l: Locale, key: 'alt' | 'caption') => ({
    value: meta[l][key],
    onChange: (v: string) => {
      setDone(false);
      setMeta((m) => ({ ...m, [l]: { ...m[l], [key]: v } }));
    },
    error: errors[`translations.${l}.${key}`],
    disabled: disabled || pending,
  });

  return (
    <Surface as="section" variant="raised" radius="md" aria-labelledby="upload-title">
      <header className="flex flex-col gap-1 border-b border-line px-5 py-3.5">
        <h2 id="upload-title" className="font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">
          Upload an image
        </h2>
        <p className="text-body-sm text-fg-muted">
          Screenshots work best at 16:10 or wider. The image is added at the end of the gallery, and is public right away
          if the project is published.
        </p>
      </header>
      <div className="flex flex-col gap-5 px-5 py-5">
        {reason && <p className="rounded-md border border-line bg-fg/[0.03] px-3.5 py-2.5 text-body-sm text-fg-muted">{reason}</p>}
        <ImageUploadField
          label="Image"
          file={file}
          onChange={(f) => {
            setDone(false);
            setFile(f);
            setErrors((e) => ({ ...e, file: '' }));
          }}
          error={errors.file || undefined}
          disabled={disabled || pending}
        />
        <div className="grid gap-5 md:grid-cols-2">
          {LOCALES.map((l) => (
            <div key={l} className="flex flex-col gap-4">
              <TextField
                label={`Alt text · ${LOCALE_TAGS[l].label}${l === DEFAULT_LOCALE ? '' : ' (optional)'}`}
                maxLength={300}
                {...field(l, 'alt')}
              />
              <TextField label={`Caption · ${LOCALE_TAGS[l].label} (optional)`} maxLength={300} {...field(l, 'caption')} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={upload}
            disabled={disabled || pending || !file}
            className={buttonStyles({ size: 'sm', className: 'min-w-28' })}
          >
            {pending && (
              <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            )}
            {pending ? 'Uploading' : 'Upload image'}
          </button>
          <p role={formError ? 'alert' : 'status'} className={cn('text-body-sm', formError ? 'text-danger' : 'text-fg-muted')}>
            {formError ?? (done ? 'Uploaded.' : '')}
          </p>
        </div>
      </div>
    </Surface>
  );
}
