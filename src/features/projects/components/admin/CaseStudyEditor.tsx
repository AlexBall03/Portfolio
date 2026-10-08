'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, SelectField, StringListField, SwitchField, TextField } from '@/components/admin/form/fields';
import { LocaleTabs, TranslationBadge } from '@/components/admin/form/LocaleTabs';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { type Editor, useEditor } from '@/components/admin/form/use-editor';
import { Status } from '@/components/ui/Status';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { blankLocales, errorsByLocale, translationStatus, worstStatus } from '@/lib/cms/locale';
import { MAX_SECTION_ITEMS, MAX_SECTIONS, SECTION_KINDS, SECTION_SPECS, type SectionKind } from '../../case-study';
import { saveProjectSections } from '../../mutations';
import { sectionItemTranslationInput, sectionTranslationFor } from '../../schema';
import type { CaseStudyValues, ProjectImageChoice, SectionItemValues, SectionValues } from '../../types';
import { ProjectImagePicker } from './ProjectImagePicker';

const KIND_OPTIONS = SECTION_KINDS.map((k) => ({ value: k, label: SECTION_SPECS[k].label }));

const MARKUP_HINT = 'Supports **bold**, *emphasis*, `code`, [links](https://…), and lines starting with “- ” for bullets.';

const blankItem = (): SectionItemValues => ({ key: newKey(), translations: blankLocales(() => ({ title: '', body: '' })) });

const blankSection = (kind: SectionKind): SectionValues => {
  const spec = SECTION_SPECS[kind];
  return {
    key: newKey(),
    kind,
    // New sections start hidden: on a published project, nothing goes live until it's switched on.
    visible: false,
    videoUrl: '',
    translations: blankLocales(() => ({ heading: '', body: spec.body ? [''] : [] })),
    items: spec.items ? [blankItem()] : [],
    media: [],
  };
};

/** Each section's (and entry's) status for one locale, judged by the schemas the server saves with. */
function statusesFor(sections: SectionValues[], locale: Locale) {
  return worstStatus(
    sections.flatMap((s) => [
      translationStatus(sectionTranslationFor(s.kind), s.translations[locale]),
      ...s.items.map((item) => translationStatus(sectionItemTranslationInput, item.translations[locale])),
    ]),
  );
}

interface CaseStudyEditorProps {
  projectId: string;
  initial: CaseStudyValues;
  images: ProjectImageChoice[];
  published: boolean;
}

/**
 * A project's case-study sections: add one of the structured kinds, fill in
 * its text per language, reorder, show or hide. One Save writes every
 * section in one transaction. Visible sections of a published project go
 * live on Save; hidden ones appear only in Preview.
 */
export function CaseStudyEditor({ projectId, initial, images, published }: CaseStudyEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectSections({ projectId, ...values }));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [adding, setAdding] = useState<SectionKind>('narrative');
  const sections = editor.values.sections;
  const status = Object.fromEntries(LOCALES.map((l) => [l, statusesFor(sections, l)])) as Record<Locale, ReturnType<typeof worstStatus>>;

  return (
    <EditorForm
      editor={editor}
      label="Case study"
      savedNote={published ? 'visible sections are live' : 'saved; public once the project is published'}
    >
      <LocaleTabs active={locale} onChange={setLocale} status={status} errorCount={errorsByLocale(editor.errors)}>
        <EditorSection
          title="Sections"
          description={
            <>
              Shown after the overview, in this order. New sections start <strong>hidden</strong>: draft them, check
              Preview, then switch on Visible. {published && 'This project is published, so visible sections change on the live page when you save.'}
            </>
          }
        >
          <div className="max-w-xs">
            <SelectField label="New section type" value={adding} options={KIND_OPTIONS} onChange={setAdding} hint={SECTION_SPECS[adding].description} />
          </div>
          <RepeatableList
            items={sections}
            onChange={(next) => editor.update((v) => ({ ...v, sections: next }), ['sections'])}
            create={() => blankSection(adding)}
            itemLabel={(s, i) => s.translations.en.heading || `section ${i + 1}`}
            summary={(s) => (
              <>
                <Status tone="accent">{SECTION_SPECS[s.kind].label}</Status>
                <span className="truncate font-medium text-fg">{s.translations.en.heading || 'Untitled section'}</span>
                {s.visible ? <Status tone="success">Visible</Status> : <Status>Hidden</Status>}
                <TranslationBadge locale={locale} status={translationStatus(sectionTranslationFor(s.kind), s.translations[locale])} />
              </>
            )}
            addLabel={`Add ${SECTION_SPECS[adding].label.toLowerCase()} section`}
            emptyLabel="No case-study sections yet. The page shows the overview, images, and metadata until you add some."
            max={MAX_SECTIONS}
            disabled={editor.pending}
          >
            {(s, i) => <SectionFields editor={editor} index={i} section={s} locale={locale} projectId={projectId} images={images} />}
          </RepeatableList>
          {editor.errorFor(['sections']) && <FieldError>{editor.errorFor(['sections'])}</FieldError>}
        </EditorSection>
      </LocaleTabs>
    </EditorForm>
  );
}

interface SectionFieldsProps {
  editor: Editor<CaseStudyValues>;
  index: number;
  section: SectionValues;
  locale: Locale;
  projectId: string;
  images: ProjectImageChoice[];
}

function SectionFields({ editor, index: i, section: s, locale, projectId, images }: SectionFieldsProps) {
  const spec = SECTION_SPECS[s.kind];
  const path = (...rest: (string | number)[]) => ['sections', i, ...rest];
  const t = (field: string) => path('translations', locale, field);
  const english = locale === DEFAULT_LOCALE ? undefined : s.translations.en;

  return (
    <>
      <p className="text-body-sm text-fg-muted">{spec.description}</p>
      <SwitchField
        label="Visible"
        checked={s.visible}
        onChange={(v) => editor.set(path('visible'), v)}
        hint="Hidden sections appear only in Preview."
      />
      <TextField label="Heading" maxLength={120} placeholder={english?.heading || undefined} {...editor.text(t('heading'))} />

      {spec.video && (
        <TextField
          label="Video URL"
          type="url"
          hint="YouTube and Vimeo links are embedded (privacy-enhanced); any other URL is shown as a link."
          {...editor.text(path('videoUrl'))}
        />
      )}

      {spec.body && (
        <StringListField
          label={spec.video ? 'Caption (optional)' : spec.body === 'required' ? 'Paragraphs' : 'Introduction (optional)'}
          hint={MARKUP_HINT}
          values={s.translations[locale].body}
          onChange={(next) => editor.set(t('body'), next)}
          errorAt={(j) => editor.errorFor([...t('body'), j])}
          error={editor.errorFor(t('body'))}
          placeholderAt={(j) => english?.body[j]}
          itemLabel={(j) => `Paragraph ${j + 1}`}
          addLabel="Add paragraph"
          max={20}
          maxLength={4000}
          multiline
        />
      )}

      {spec.items && (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-3 text-body-sm font-medium text-fg">{spec.items.title}s</legend>
          <RepeatableList
            items={s.items}
            onChange={(next) => editor.update((v) => ({ ...v, sections: v.sections.map((x, j) => (j === i ? { ...x, items: next } : x)) }), path('items'))}
            create={blankItem}
            itemLabel={(_, j) => `${spec.items ? spec.items.noun : 'entry'} ${j + 1}`}
            summary={(item) => (
              <>
                <span className="truncate text-fg">{item.translations.en.title || `New ${spec.items ? spec.items.noun : 'entry'}`}</span>
                <TranslationBadge locale={locale} status={translationStatus(sectionItemTranslationInput, item.translations[locale])} />
              </>
            )}
            addLabel={`Add ${spec.items.noun}`}
            emptyLabel={`No ${spec.items.noun}s yet.`}
            max={MAX_SECTION_ITEMS}
            disabled={editor.pending}
          >
            {(item, j) => {
              const it = (field: string) => path('items', j, 'translations', locale, field);
              const en = locale === DEFAULT_LOCALE ? undefined : item.translations.en;
              return (
                <>
                  <TextField label={spec.items ? spec.items.title : 'Title'} maxLength={200} placeholder={en?.title || undefined} {...editor.text(it('title'))} />
                  <TextField
                    label={spec.items ? spec.items.body : 'Detail'}
                    hint="Inline **bold**, *emphasis*, `code`, and [links](https://…) work here."
                    maxLength={2000}
                    multiline
                    placeholder={en?.body || undefined}
                    {...editor.text(it('body'))}
                  />
                </>
              );
            }}
          </RepeatableList>
          {editor.errorFor(path('items')) && <FieldError>{editor.errorFor(path('items'))}</FieldError>}
        </fieldset>
      )}

      {spec.media && (
        <ProjectImagePicker
          projectId={projectId}
          images={images}
          value={s.media}
          onChange={(next) => editor.update((v) => ({ ...v, sections: v.sections.map((x, j) => (j === i ? { ...x, media: next } : x)) }), path('media'))}
          error={editor.errorFor(path('media'))}
          disabled={editor.pending}
        />
      )}
    </>
  );
}
