'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, TextField } from '@/components/admin/form/fields';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { saveTechnologies } from '../../mutations';
import type { TechnologyValues } from '../../types';

const usage = (t: TechnologyValues) => {
  const parts = [
    t.projects && `${t.projects} project${t.projects === 1 ? '' : 's'}`,
    t.categories && `${t.categories} skill categor${t.categories === 1 ? 'y' : 'ies'}`,
  ].filter(Boolean);
  return parts.length ? `Used by ${parts.join(' and ')}` : 'Not used';
};

/**
 * The shared technology vocabulary behind project stacks and skill
 * categories. Renaming changes every place it appears; a technology can be
 * removed only once nothing lists it. New ones are added from those editors.
 */
export function TechnologiesEditor({ initial }: { initial: TechnologyValues[] }) {
  const editor = useEditor({ items: initial }, saveTechnologies);
  const items = editor.values.items;
  const listError = editor.errorFor(['items']);

  return (
    <EditorForm editor={editor} label="Technologies">
      <EditorSection
        title="Technologies"
        description="Alphabetical. Renaming updates every project and category that lists it; slugs never change."
      >
        {items.length === 0 ? (
          <p className="text-body-sm text-fg-muted">No technologies yet. Add them from a project or skill category.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((t, i) => {
              const used = t.projects + t.categories > 0;
              return (
                <li key={t.key} className="grid items-start gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <TextField label={`Name (${t.slug})`} hint={usage(t)} maxLength={60} {...editor.text(['items', i, 'name'])} />
                  <button
                    type="button"
                    disabled={used}
                    title={used ? 'Remove it from those projects and categories first' : undefined}
                    onClick={() => editor.update((v) => ({ ...v, items: v.items.filter((_, j) => j !== i) }), ['items'])}
                    className={buttonStyles({ variant: 'danger', size: 'sm', className: 'justify-self-start' })}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {listError && <FieldError>{listError}</FieldError>}
      </EditorSection>
    </EditorForm>
  );
}
