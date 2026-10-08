'use client';

import Image from 'next/image';
import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { LocaleTabs, TranslationBadge } from '@/components/admin/form/LocaleTabs';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { Status } from '@/components/ui/Status';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { blankLocales, errorsByLocale, localeStatuses, translationStatus } from '@/lib/cms/locale';
import { MAX_MILESTONES, type MilestoneKind, type MilestonePrecision } from '../../case-study';
import { saveProjectMilestones } from '../../mutations';
import { milestoneTranslationInput } from '../../schema';
import type { MilestonesValues, MilestoneValues, ProjectImageChoice } from '../../types';

const KIND_OPTIONS: readonly { value: MilestoneKind; label: string }[] = [
  { value: 'started', label: 'Started' },
  { value: 'feature', label: 'Feature' },
  { value: 'release', label: 'Release' },
  { value: 'launch', label: 'Launch' },
  { value: 'refactor', label: 'Rework / refactor' },
  { value: 'other', label: 'Milestone' },
];

const PRECISION_OPTIONS: readonly { value: MilestonePrecision; label: string }[] = [
  { value: 'day', label: 'Day, month, and year' },
  { value: 'month', label: 'Month and year' },
  { value: 'year', label: 'Year only' },
];

const blankMilestone = (): MilestoneValues => ({
  key: newKey(),
  occurredOn: '',
  datePrecision: 'month',
  kind: 'feature',
  url: '',
  assetId: '',
  // New milestones start hidden, so a published project's timeline changes only when you switch one on.
  visible: false,
  translations: blankLocales(() => ({ title: '', description: '' })),
});

/** Oldest first (the public order); undated drafts last. */
const byDate = (a: MilestoneValues, b: MilestoneValues) => (a.occurredOn || '9999').localeCompare(b.occurredOn || '9999');

interface MilestoneEditorProps {
  projectId: string;
  initial: MilestonesValues;
  images: ProjectImageChoice[];
  published: boolean;
}

/**
 * A project's curated development milestones. The public timeline is always
 * chronological; the list order here only breaks ties between milestones on
 * the same date. One Save writes the whole list in one transaction.
 */
export function MilestoneEditor({ projectId, initial, images, published }: MilestoneEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectMilestones({ projectId, ...values }));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const items = editor.values.milestones;
  const sorted = [...items].sort(byDate);
  const inOrder = sorted.every((m, i) => m.key === items[i]?.key);
  const path = (i: number, ...rest: (string | number)[]) => ['milestones', i, ...rest];
  const imageOptions = [{ value: '', label: 'No image' }, ...images.map((img, i) => ({ value: img.assetId, label: img.alt || `Image ${i + 1}` }))];

  return (
    <EditorForm editor={editor} label="Milestones" savedNote={published ? 'visible milestones are live' : 'saved; public once the project is published'}>
      <LocaleTabs
        active={locale}
        onChange={setLocale}
        status={localeStatuses(milestoneTranslationInput, items.map((m) => m.translations))}
        errorCount={errorsByLocale(editor.errors)}
      >
        <EditorSection
          title="Development timeline"
          description={
            <>
              Shown oldest first on the project page. New milestones start <strong>hidden</strong>; switch on Visible when
              they’re ready. These are curated by hand and kept separate from GitHub activity.
            </>
          }
        >
          <div>
            <button
              type="button"
              disabled={inOrder}
              onClick={() => editor.update((v) => ({ ...v, milestones: sorted }), ['milestones'])}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Sort by date
            </button>
          </div>
          <RepeatableList
            items={items}
            onChange={(next) => editor.update((v) => ({ ...v, milestones: next }), ['milestones'])}
            create={blankMilestone}
            itemLabel={(_, i) => `milestone ${i + 1}`}
            summary={(m) => (
              <>
                {m.occurredOn && <span className="font-mono text-micro text-fg-faint">{m.occurredOn}</span>}
                <span className="truncate font-medium text-fg">{m.translations.en.title || 'Untitled milestone'}</span>
                {m.visible ? <Status tone="success">Visible</Status> : <Status>Hidden</Status>}
                <TranslationBadge locale={locale} status={translationStatus(milestoneTranslationInput, m.translations[locale])} />
              </>
            )}
            addLabel="Add milestone"
            emptyLabel="No milestones yet. The timeline is left off the project page until one is visible."
            max={MAX_MILESTONES}
            disabled={editor.pending}
          >
            {(m, i) => {
              const t = (field: string) => path(i, 'translations', locale, field);
              const english = locale === DEFAULT_LOCALE ? undefined : m.translations.en;
              const image = images.find((img) => img.assetId === m.assetId);
              return (
                <>
                  <TextField label="Title" maxLength={160} placeholder={english?.title || undefined} {...editor.text(t('title'))} />
                  <TextField
                    label="Description (optional)"
                    hint="Inline **bold**, *emphasis*, `code`, and [links](https://…) work here."
                    maxLength={1000}
                    multiline
                    placeholder={english?.description || undefined}
                    {...editor.text(t('description'))}
                  />
                  <div className="grid gap-5 sm:grid-cols-3">
                    <TextField label="Date" type="date" {...editor.text(path(i, 'occurredOn'))} />
                    <SelectField
                      label="Show date as"
                      value={m.datePrecision}
                      options={PRECISION_OPTIONS}
                      onChange={(v) => editor.set(path(i, 'datePrecision'), v)}
                      error={editor.errorFor(path(i, 'datePrecision'))}
                    />
                    <SelectField
                      label="Type"
                      value={m.kind}
                      options={KIND_OPTIONS}
                      onChange={(v) => editor.set(path(i, 'kind'), v)}
                      error={editor.errorFor(path(i, 'kind'))}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Link (optional)" type="url" hint="A release, article, or pull request." {...editor.text(path(i, 'url'))} />
                    <div className="flex flex-col gap-3">
                      <SelectField
                        label="Image (optional)"
                        hint={images.length ? 'One of this project’s images (Media tab).' : 'Upload images on the Media tab first.'}
                        value={m.assetId}
                        options={imageOptions}
                        onChange={(v) => editor.set(path(i, 'assetId'), v)}
                        error={editor.errorFor(path(i, 'assetId'))}
                      />
                      {image && (
                        <span className="relative block aspect-[16/10] w-32 overflow-hidden rounded-sm border border-line bg-surface-inset">
                          <Image src={image.src} alt="" fill sizes="128px" className="object-cover object-top" />
                        </span>
                      )}
                    </div>
                  </div>
                  <SwitchField
                    label="Visible"
                    checked={m.visible}
                    onChange={(v) => editor.set(path(i, 'visible'), v)}
                    hint="Hidden milestones appear only in Preview."
                  />
                </>
              );
            }}
          </RepeatableList>
          {editor.errorFor(['milestones']) && <FieldError>{editor.errorFor(['milestones'])}</FieldError>}
        </EditorSection>
      </LocaleTabs>
    </EditorForm>
  );
}
