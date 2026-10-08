'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, StringListField, SwitchField, TextField } from '@/components/admin/form/fields';
import { LocaleTabs, TranslationBadge } from '@/components/admin/form/LocaleTabs';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { type Editor, useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { Status } from '@/components/ui/Status';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { blankLocales, errorsByLocale, localeStatuses, translationStatus } from '@/lib/cms/locale';
import { saveExperiences } from '../../mutations';
import { experienceTranslationInput } from '../../schema';
import type { DatePrecision, ExperienceKind, ExperiencesValues, ExperienceValues } from '../../types';

const PRECISION_OPTIONS: readonly { value: DatePrecision; label: string }[] = [
  { value: 'month', label: 'Month and year' },
  { value: 'year', label: 'Year only' },
];

const KINDS: readonly { kind: ExperienceKind; title: string; description: string; noun: string }[] = [
  { kind: 'career', title: 'Career', description: 'Positions on the Experience page, in this order.', noun: 'position' },
  { kind: 'education', title: 'Education', description: 'Degrees and schooling, in this order.', noun: 'entry' },
];

const blankEntry = (): ExperienceValues => ({
  key: newKey(),
  organization: '',
  startDate: '',
  endDate: '',
  datePrecision: 'month',
  isCurrent: false,
  visible: true,
  translations: blankLocales(() => ({
    organizationLabel: '',
    role: '',
    employmentType: '',
    location: '',
    summary: [''],
    tags: [],
  })),
});

/** Current entries first, then the most recent end (or start) first. */
const byDate = (a: ExperienceValues, b: ExperienceValues) =>
  Number(b.isCurrent) - Number(a.isCurrent) ||
  (b.endDate || '9999').localeCompare(a.endDate || '9999') ||
  b.startDate.localeCompare(a.startDate);

const range = (e: ExperienceValues) => {
  const fmt = (d: string) => (e.datePrecision === 'year' ? d.slice(0, 4) : d.slice(0, 7));
  if (!e.startDate) return null;
  return `${fmt(e.startDate)} – ${e.endDate ? fmt(e.endDate) : 'Present'}`;
};

/** Career and education entries in one form, one language tab shared by both. */
export function ExperienceEditor({ initial }: { initial: ExperiencesValues }) {
  const editor = useEditor(initial, saveExperiences);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const all = [...editor.values.career, ...editor.values.education];

  return (
    <EditorForm editor={editor} label="Experience">
      <LocaleTabs
        active={locale}
        onChange={setLocale}
        status={localeStatuses(experienceTranslationInput, all.map((e) => e.translations))}
        errorCount={errorsByLocale(editor.errors)}
      >
        {KINDS.map((k) => (
          <EditorSection key={k.kind} title={k.title} description={k.description}>
            <ExperienceList editor={editor} kind={k.kind} noun={k.noun} locale={locale} />
          </EditorSection>
        ))}
      </LocaleTabs>
    </EditorForm>
  );
}

function ExperienceList({
  editor,
  kind,
  noun,
  locale,
}: {
  editor: Editor<ExperiencesValues>;
  kind: ExperienceKind;
  noun: string;
  locale: Locale;
}) {
  const items = editor.values[kind];
  const path = (i: number, ...rest: (string | number)[]) => [kind, i, ...rest];
  const sorted = [...items].sort(byDate);
  const inOrder = sorted.every((e, i) => e.key === items[i]?.key);

  return (
    <>
      <div>
        <button
          type="button"
          disabled={inOrder}
          onClick={() => editor.update((v) => ({ ...v, [kind]: sorted }), [kind])}
          className={buttonStyles({ variant: 'secondary', size: 'sm' })}
        >
          Sort by date
        </button>
      </div>
      <RepeatableList
        items={items}
        onChange={(next) => editor.update((v) => ({ ...v, [kind]: next }), [kind])}
        create={blankEntry}
        itemLabel={(_, i) => `${noun} ${i + 1}`}
        summary={(e) => (
          <>
            <span className="truncate font-medium text-fg">
              {e.translations.en.role || `Untitled ${noun}`}
              {e.organization && <span className="text-fg-muted"> · {e.organization}</span>}
            </span>
            {range(e) && <span className="font-mono text-micro text-fg-faint">{range(e)}</span>}
            {e.isCurrent && <Status tone="brand">Current</Status>}
            {!e.visible && <Status>Hidden</Status>}
            <TranslationBadge locale={locale} status={translationStatus(experienceTranslationInput, e.translations[locale])} />
          </>
        )}
        addLabel={`Add ${noun}`}
        emptyLabel={`No ${noun}s yet.`}
        max={30}
      >
        {(e, i) => {
          const t = (field: string) => path(i, 'translations', locale, field);
          const current = e.translations[locale];
          const english = locale === DEFAULT_LOCALE ? undefined : e.translations.en;
          return (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Organization"
                  hint="Proper name, the same in every language."
                  maxLength={150}
                  {...editor.text(path(i, 'organization'))}
                />
                <TextField
                  label="Organization label (optional)"
                  hint="Replaces the name in this language, e.g. “Career break”."
                  maxLength={150}
                  placeholder={english?.organizationLabel || undefined}
                  {...editor.text(t('organizationLabel'))}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Role" maxLength={150} placeholder={english?.role || undefined} {...editor.text(t('role'))} />
                <TextField
                  label="Type (optional)"
                  hint="e.g. Full-time, Internship."
                  maxLength={60}
                  placeholder={english?.employmentType || undefined}
                  {...editor.text(t('employmentType'))}
                />
              </div>
              <TextField
                label="Location (optional)"
                maxLength={150}
                placeholder={english?.location || undefined}
                {...editor.text(t('location'))}
              />
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField label="Start date" type="date" {...editor.text(path(i, 'startDate'))} />
                <TextField
                  label="End date"
                  type="date"
                  hint={e.isCurrent ? 'Blank shows “Present”; a future date shows as expected.' : undefined}
                  {...editor.text(path(i, 'endDate'))}
                />
                <SelectField
                  label="Show dates as"
                  value={e.datePrecision}
                  options={PRECISION_OPTIONS}
                  onChange={(v) => editor.set(path(i, 'datePrecision'), v)}
                  error={editor.errorFor(path(i, 'datePrecision'))}
                />
              </div>
              <StringListField
                label="Summary"
                values={current.summary}
                onChange={(next) => editor.set(t('summary'), next)}
                errorAt={(j) => editor.errorFor([...t('summary'), j])}
                error={editor.errorFor(t('summary'))}
                placeholderAt={(j) => english?.summary[j]}
                itemLabel={(j) => `Paragraph ${j + 1}`}
                addLabel="Add paragraph"
                max={12}
                maxLength={2000}
                multiline
              />
              <StringListField
                label="Tags"
                values={current.tags}
                onChange={(next) => editor.set(t('tags'), next)}
                errorAt={(j) => editor.errorFor([...t('tags'), j])}
                error={editor.errorFor(t('tags'))}
                placeholderAt={(j) => english?.tags[j]}
                itemLabel={(j) => `Tag ${j + 1}`}
                addLabel="Add tag"
                max={12}
                maxLength={60}
              />
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <SwitchField
                  label="Current"
                  checked={e.isCurrent}
                  onChange={(v) => editor.set(path(i, 'isCurrent'), v)}
                />
                <SwitchField label="Visible" checked={e.visible} onChange={(v) => editor.set(path(i, 'visible'), v)} />
              </div>
            </>
          );
        }}
      </RepeatableList>
    </>
  );
}
