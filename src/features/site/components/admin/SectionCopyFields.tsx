'use client';

import { TextField } from '@/components/admin/form/fields';
import type { Editor } from '@/components/admin/form/use-editor';
import type { Path } from '@/lib/cms/values';
import { SECTIONS, type SectionField, type SectionKey } from '../../types';

const FIELDS: readonly { field: SectionField; label: string; max: number; multiline?: boolean }[] = [
  { field: 'eyebrow', label: 'Eyebrow', max: 60 },
  { field: 'title', label: 'Title', max: 120 },
  { field: 'subtitle', label: 'Subtitle', max: 300, multiline: true },
  { field: 'body', label: 'Introduction', max: 1000, multiline: true },
  { field: 'aside', label: 'Secondary heading', max: 60 },
];

const OPTIONAL: ReadonlySet<SectionField> = new Set(['subtitle', 'body', 'aside']);

interface SectionCopyFieldsProps<V> {
  editor: Editor<V>;
  /** Path of the section's copy inside the editor values. */
  base: Path;
  section: SectionKey;
}

/** The heading fields one public section renders. Plain text only. */
export function SectionCopyFields<V>({ editor, base, section }: SectionCopyFieldsProps<V>) {
  const shown = SECTIONS[section].fields;
  return (
    <div className="flex flex-col gap-5">
      {FIELDS.filter((f) => shown[f.field]).map((f) => (
        <TextField
          key={f.field}
          label={OPTIONAL.has(f.field) ? `${f.label} (optional)` : f.label}
          hint={shown[f.field]}
          maxLength={f.max}
          multiline={f.multiline}
          rows={f.field === 'body' ? 4 : 2}
          {...editor.text([...base, f.field])}
        />
      ))}
    </div>
  );
}
