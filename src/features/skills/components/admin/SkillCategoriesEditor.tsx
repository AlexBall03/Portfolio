'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';

import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { TechnologyPicker } from '@/components/admin/form/TechnologyPicker';
import { type Editor, useEditor } from '@/components/admin/form/use-editor';
import { Icon } from '@/components/ui/Icon';
import { Status } from '@/components/ui/Status';
import { ACCENT_OPTIONS, ICON_OPTIONS } from '@/features/profile/components/admin/options';
import type { Technology } from '@/features/projects/types';

import { slugify } from '@/lib/cms/values';
import { saveSkillCategories } from '../../mutations';

import type { SkillCategoriesValues, SkillCategoryKind, SkillCategoryValues } from '../../types';

const KINDS: readonly { kind: SkillCategoryKind; title: string; description: string; noun: string; max: number }[] = [
  {
    kind: 'stack',
    title: 'Stack',
    description: 'The groups in the About page’s technology list, in this order.',
    noun: 'category',
    max: 20,
  },
  {
    kind: 'learning',
    title: 'Learning next',
    description: 'Highlighted banners under the stack list, labeled with the Stack section’s secondary heading.',
    noun: 'banner',
    max: 5,
  },
];

const blankCategory = (kind: SkillCategoryKind) => (): SkillCategoryValues => ({
  key: newKey(),
  slug: '',
  name: '',
  icon: 'code',
  accent: kind === 'learning' ? 'gold' : 'blue',
  visible: true,
  technologies: [],
});

/** Skill categories: both lists in one form. */
export function SkillCategoriesEditor({
  initial,
  technologies,
}: {
  initial: SkillCategoriesValues;
  technologies: Technology[];
}) {
  const editor = useEditor(initial, saveSkillCategories);

  return (
    <EditorForm editor={editor} label="Skill categories">
      {KINDS.map((k) => (
        <EditorSection key={k.kind} title={k.title} description={k.description}>
          <CategoryList editor={editor} technologies={technologies} {...k} />
        </EditorSection>
      ))}
    </EditorForm>
  );
}

function CategoryList({
  editor,
  technologies,
  kind,
  noun,
  max,
}: {
  editor: Editor<SkillCategoriesValues>;
  technologies: Technology[];
  kind: SkillCategoryKind;
  noun: string;
  max: number;
}) {
  const path = (i: number, ...rest: (string | number)[]) => [kind, i, ...rest];
  return (
    <RepeatableList
      items={editor.values[kind]}
      onChange={(next) => editor.update((v) => ({ ...v, [kind]: next }), [kind])}
      create={blankCategory(kind)}
      itemLabel={(_, i) => `${noun} ${i + 1}`}
      summary={(c) => (
        <>
          {c.icon && <Icon name={c.icon} className="size-4 shrink-0 text-brand-fg" />}
          <span className="truncate font-medium text-fg">{c.name || `Untitled ${noun}`}</span>
          <span className="text-fg-faint">{c.technologies.length} technologies</span>
          {!c.visible && <Status>Hidden</Status>}

        </>
      )}
      addLabel={`Add ${noun}`}
      emptyLabel={`No ${noun}s yet.`}
      max={max}
    >
      {(c, i) => {
        const name = editor.text(path(i, 'name'));
        return (
          <>
            <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
              <TextField
                label="Name"
                maxLength={80}
                {...name}
                onChange={(value) => {
                  // A new category's slug follows its name until edited by hand.
                  if (!c.id && (!c.slug || c.slug === slugify(c.name))) {
                    editor.set(path(i, 'slug'), slugify(value));
                  }
                  name.onChange(value);
                }}
              />
              <TextField label="Slug" hint="Internal identifier; never shown." maxLength={80} {...editor.text(path(i, 'slug'))} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Icon"
                value={c.icon}
                options={ICON_OPTIONS}
                onChange={(v) => editor.set(path(i, 'icon'), v)}
                error={editor.errorFor(path(i, 'icon'))}
              />
              <SelectField
                label="Accent"
                value={c.accent}
                options={ACCENT_OPTIONS}
                onChange={(v) => editor.set(path(i, 'accent'), v)}
                error={editor.errorFor(path(i, 'accent'))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-body-sm font-medium text-fg">Technologies</p>
              <p className="text-micro text-fg-faint">In display order. New names are added to the shared technology list.</p>
              <TechnologyPicker
                options={technologies}
                chosen={c.technologies}
                onChange={(next) =>
                  editor.update(
                    (v) => ({ ...v, [kind]: v[kind].map((x, j) => (j === i ? { ...x, technologies: next } : x)) }),
                    path(i, 'technologies'),
                  )
                }
                error={editor.errorFor(path(i, 'technologies'))}
              />
            </div>
            <SwitchField label="Visible" checked={c.visible} onChange={(v) => editor.set(path(i, 'visible'), v)} />
          </>
        );
      }}
    </RepeatableList>
  );
}
