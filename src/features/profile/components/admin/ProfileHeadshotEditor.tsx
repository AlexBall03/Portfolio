'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, TextField } from '@/components/admin/form/fields';
import { ImageUploadField, sendUpload } from '@/components/admin/form/ImageUploadField';
import { LocaleTabs } from '@/components/admin/form/LocaleTabs';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { errorsByLocale, localeStatuses } from '@/lib/cms/locale';
import type { MutationResult } from '@/lib/cms/result';
import type { ImageMimeType } from '@/lib/image-file';
import { removeHeadshot, saveHeadshotText } from '../../mutations';
import { headshotTranslationInput } from '../../schema';
import type { HeadshotValues } from '../../types';

const UPLOAD_URL = '/api/admin/profile/headshot';
/** The share cards' renderer decodes only these, so the headshot is limited to them. */
const HEADSHOT_TYPES: readonly ImageMimeType[] = ['image/jpeg', 'image/png'];

/** The editor's values: what the server stores, plus a photo picked but not yet uploaded. */
type Values = HeadshotValues & { file: File | null };

const withFile = (values: HeadshotValues): Values => ({ ...values, file: null });

/** Saving sends the picked photo with its alt text (an upload), or just the alt text. */
async function save({ file, ...values }: Values): Promise<MutationResult<Values>> {
  let result: MutationResult<HeadshotValues>;
  if (file) {
    const body = new FormData();
    body.set('file', file);
    for (const l of LOCALES) body.set(`alt.${l}`, values.translations[l].alt);
    result = await sendUpload<HeadshotValues>(UPLOAD_URL, body);
  } else if (values.photo) {
    result = await saveHeadshotText({ translations: values.translations });
  } else {
    return { ok: false, fieldErrors: { file: 'Choose a photo to upload' }, formError: 'There is no photo yet: choose one first.' };
  }
  return result.ok ? { ...result, data: withFile(result.data) } : result;
}

interface ProfileHeadshotEditorProps {
  initial: HeadshotValues;
  /** Whether the Blob store is connected in this environment. */
  storageConfigured: boolean;
}

/**
 * The headshot: the hero portrait, the avatar on the share cards, and the
 * JSON-LD person image. Choosing a photo and editing alt text are edits saved
 * together with Save; removing the photo happens on confirmation.
 */
export function ProfileHeadshotEditor({ initial, storageConfigured }: ProfileHeadshotEditorProps) {
  const editor = useEditor<Values>(withFile(initial), save);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const [removing, startRemove] = useTransition();
  const { values } = editor;
  const english = values.translations[DEFAULT_LOCALE];

  const remove = () =>
    startRemove(async () => {
      setConfirmRemove(false);
      const result = await removeHeadshot();
      if (result.ok) {
        setRemoveError(undefined);
        editor.reset(withFile(result.data));
      } else setRemoveError(result.formError ?? 'Removing the photo failed.');
    });

  return (
    <>
      <EditorForm editor={editor} label="Headshot" savedNote="the site and its link previews are updated">
        <EditorSection
          title="Photo"
          description="Shown in the home page hero, on the share cards for every page, and in search results' structured data."
        >
          {!storageConfigured && (
            <p className="rounded-md border border-line bg-fg/[0.03] px-3.5 py-2.5 text-body-sm text-fg-muted">
              Uploads need Vercel Blob: connect a Blob store to this project (see docs/admin-setup.md). Alt text can still be
              edited.
            </p>
          )}
          <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <span className="text-body-sm font-medium text-fg">Current photo</span>
              <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-md border border-line bg-surface-inset">
                {values.photo ? (
                  <Image
                    src={values.photo.src}
                    alt={english.alt}
                    fill
                    sizes="208px"
                    className="object-cover object-[50%_18%]"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-center text-body-sm text-fg-faint">
                    <Icon name="user" className="size-6" />
                    No photo
                  </span>
                )}
              </div>
              {values.photo && (
                <>
                  <span className="font-mono text-micro text-fg-faint">
                    {values.photo.width && values.photo.height ? `${values.photo.width} × ${values.photo.height}` : 'Size unknown'}
                    {values.photo.uploaded ? '' : ' · bundled default'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={editor.dirty || editor.pending || removing}
                    className={buttonStyles({ variant: 'danger', size: 'sm' })}
                  >
                    Remove photo
                  </button>
                  {editor.dirty && <p className="text-micro text-fg-faint">Save or discard your changes before removing.</p>}
                  {removeError && <FieldError>{removeError}</FieldError>}
                </>
              )}
            </div>
            <ImageUploadField
              label={values.photo ? 'Replace with a new photo' : 'Upload a photo'}
              file={values.file}
              onChange={(file) => editor.set(['file'], file)}
              error={editor.errorFor(['file'])}
              disabled={!storageConfigured || editor.pending}
              types={HEADSHOT_TYPES}
              hint="JPEG or PNG, up to 4 MB (link previews can't show other formats). A portrait crop (4:5) works best; the face sits in the upper third. The new photo goes live when you save."
            />
          </div>
        </EditorSection>

        <EditorSection title="Alt text" description="What the photo shows, for people who can't see it. Per language.">
          <LocaleTabs
            active={locale}
            onChange={setLocale}
            status={localeStatuses(headshotTranslationInput, [values.translations])}
            errorCount={errorsByLocale(editor.errors)}
          >
            <TextField
              label="Alt text"
              maxLength={300}
              placeholder={locale === DEFAULT_LOCALE ? 'e.g. Portrait of Alexander D. Ball' : english.alt}
              {...editor.text(['translations', locale, 'alt'])}
            />
          </LocaleTabs>
        </EditorSection>
      </EditorForm>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove the headshot?"
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={remove}
      >
        <p>The hero and the share cards show a placeholder until you upload a new photo. An uploaded file is deleted.</p>
      </ConfirmDialog>
    </>
  );
}
