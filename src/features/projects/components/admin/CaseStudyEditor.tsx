'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, SelectField, StringListField, SwitchField, TextField } from '@/components/admin/form/fields';

import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { type Editor, useEditor } from '@/components/admin/form/use-editor';
import { Status } from '@/components/ui/Status';

import { MAX_SECTION_ITEMS, MAX_SECTIONS, SECTION_KINDS, SECTION_SPECS, type SectionKind } from '../../case-study';
import { saveProjectSections } from '../../mutations';

import type { CaseStudyValues, ProjectImageChoice, SectionItemValues, SectionValues } from '../../types';
import { ProjectImagePicker } from './ProjectImagePicker';

const KIND_OPTIONS = SECTION_KINDS.map((k) => ({ value: k, label: SECTION_SPECS[k].label }));

const MARKUP_HINT = 'Supports **bold**, *emphasis*, `code`, [links](https://…), and lines starting with “- ” for bullets.';

const blankItem = (): SectionItemValues => ({ key: newKey(), title: '', body: '' });

const blankSection = (kind: SectionKind): SectionValues => {
  const spec = SECTION_SPECS[kind];
  return {
    key: newKey(),
    kind,
    // New sections start hidden: on a published project, nothing goes live until it's switched on.
    visible: false,
    videoUrl: '',
    heading: '',
    body: spec.body ? [''] : [],
    items: spec.items ? [blankItem()] : [],
    media: [],
  };
};

interface CaseStudyEditorProps {
  projectId: string;
  initial: CaseStudyValues;
  images: ProjectImageChoice[];
  published: boolean;
}

/**
 * A project's case-study sections: add one of the structured kinds, fill in
 * its text, reorder, show or hide. One Save writes every
 * section in one transaction. Visible sections of a published project go
 * live on Save; hidden ones appear only in Preview.
 */
export function CaseStudyEditor({ projectId, initial, images, published }: CaseStudyEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectSections({ projectId, ...values }));
  const [adding, setAdding] = useState<SectionKind>('narrative');
  const sections = editor.values.sections;

  return (
    <EditorForm
      editor={editor}
      label="Case study"
      savedNote={published ? 'visible sections are live' : 'saved; public once the project is published'}
    >
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
          itemLabel={(s, i) => s.heading || `section ${i + 1}`}
          summary={(s) => (
            <>
              <Status tone="accent">{SECTION_SPECS[s.kind].label}</Status>
              <span className="truncate font-medium text-fg">{s.heading || 'Untitled section'}</span>
              {s.visible ? <Status tone="success">Visible</Status> : <Status>Hidden</Status>}
            </>
          )}
          addLabel={`Add ${SECTION_SPECS[adding].label.toLowerCase()} section`}
          emptyLabel="No case-study sections yet. The page shows the overview, images, and metadata until you add some."
          max={MAX_SECTIONS}
          disabled={editor.pending}
        >
          {(s, i) => <SectionFields editor={editor} index={i} section={s} projectId={projectId} images={images} />}
        </RepeatableList>
        {editor.errorFor(['sections']) && <FieldError>{editor.errorFor(['sections'])}</FieldError>}
      </EditorSection>
    </EditorForm>
  );
}

interface SectionFieldsProps {
  editor: Editor<CaseStudyValues>;
  index: number;
  section: SectionValues;
  projectId: string;
  images: ProjectImageChoice[];
}

function SectionFields({ editor, index: i, section: s, projectId, images }: SectionFieldsProps) {
  const spec = SECTION_SPECS[s.kind];
  const path = (...rest: (string | number)[]) => ['sections', i, ...rest];

  return (
    <>
      <p className="text-body-sm text-fg-muted">{spec.description}</p>
      <SwitchField
        label="Visible"
        checked={s.visible}
        onChange={(v) => editor.set(path('visible'), v)}
        hint="Hidden sections appear only in Preview."
      />
      <TextField label="Heading" maxLength={120} {...editor.text(path('heading'))} />

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
          values={s.body}
          onChange={(next) => editor.set(path('body'), next)}
          errorAt={(j) => editor.errorFor(path('body', j))}
          error={editor.errorFor(path('body'))}
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
                <span className="truncate text-fg">{item.title || `New ${spec.items ? spec.items.noun : 'entry'}`}</span>
              </>
            )}
            addLabel={`Add ${spec.items.noun}`}
            emptyLabel={`No ${spec.items.noun}s yet.`}
            max={MAX_SECTION_ITEMS}
            disabled={editor.pending}
          >
            {(_, j) => (
              <>
                <TextField label={spec.items ? spec.items.title : 'Title'} maxLength={200} {...editor.text(path('items', j, 'title'))} />
                <TextField
                  label={spec.items ? spec.items.body : 'Detail'}
                  hint="Inline **bold**, *emphasis*, `code`, and [links](https://…) work here."
                  maxLength={2000}
                  multiline
                  {...editor.text(path('items', j, 'body'))}
                />
              </>
            )}
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
