'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { type Editor, useEditor } from '@/components/admin/form/use-editor';
import { Icon } from '@/components/ui/Icon';
import { Status } from '@/components/ui/Status';
import { saveProfileHighlights } from '../../mutations';
import type { HighlightKind, HighlightsValues, HighlightValues } from '../../types';
import { ICON_OPTIONS } from './options';

const blankHighlight = (): HighlightValues => ({
  key: newKey(),
  icon: '',
  title: '',
  body: '',
  visible: true,
});

const KINDS: readonly { kind: HighlightKind; title: string; description: string; noun: string }[] = [
  {
    kind: 'differentiator',
    title: 'About cards',
    description: 'The "what sets me apart" cards on the About page.',
    noun: 'card',
  },
  { kind: 'resume', title: 'Resume highlights', description: 'The highlights beside the resume viewer.', noun: 'highlight' },
];

/** Both highlight lists in one form. */
export function ProfileHighlightsEditor({ initial }: { initial: HighlightsValues }) {
  const editor = useEditor(initial, saveProfileHighlights);

  return (
    <EditorForm editor={editor} label="Profile highlights">
      {KINDS.map((k) => (
        <EditorSection key={k.kind} title={k.title} description={k.description}>
          <HighlightList editor={editor} kind={k.kind} noun={k.noun} />
        </EditorSection>
      ))}
    </EditorForm>
  );
}

function HighlightList({ editor, kind, noun }: { editor: Editor<HighlightsValues>; kind: HighlightKind; noun: string }) {
  const path = (i: number, ...rest: (string | number)[]) => [kind, i, ...rest];
  return (
    <RepeatableList
      items={editor.values[kind]}
      onChange={(next) => editor.update((v) => ({ ...v, [kind]: next }), [kind])}
      create={blankHighlight}
      itemLabel={(_, i) => `${noun} ${i + 1}`}
      summary={(h) => (
        <>
          {h.icon && <Icon name={h.icon} className="size-4 shrink-0 text-accent-fg" />}
          <span className="truncate font-medium text-fg">{h.title || `Untitled ${noun}`}</span>
          {!h.visible && <Status>Hidden</Status>}
        </>
      )}
      addLabel={`Add ${noun}`}
      emptyLabel={`No ${noun}s yet.`}
      max={12}
    >
      {(h, i) => (
        <>
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <TextField label="Title" maxLength={120} {...editor.text(path(i, 'title'))} />
            <SelectField
              label="Icon"
              value={h.icon}
              options={[{ value: '', label: 'No icon' }, ...ICON_OPTIONS]}
              onChange={(v) => editor.set(path(i, 'icon'), v)}
              error={editor.errorFor(path(i, 'icon'))}
            />
          </div>
          <TextField label="Body" multiline maxLength={600} {...editor.text(path(i, 'body'))} />
          <SwitchField label="Visible" checked={h.visible} onChange={(v) => editor.set(path(i, 'visible'), v)} />
        </>
      )}
    </RepeatableList>
  );
}
