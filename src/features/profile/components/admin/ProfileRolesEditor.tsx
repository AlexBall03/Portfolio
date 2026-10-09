'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { Status } from '@/components/ui/Status';
import { saveProfileRoles } from '../../mutations';
import type { RoleValues } from '../../types';
import { ACCENT_OPTIONS } from './options';

const blankRole = (): RoleValues => ({
  key: newKey(),
  label: '',
  accent: 'blue',
  visible: true,
});

/** The rotating role list on the About page. */
export function ProfileRolesEditor({ initial }: { initial: RoleValues[] }) {
  const editor = useEditor({ items: initial }, saveProfileRoles);
  const items = editor.values.items;

  return (
    <EditorForm editor={editor} label="Profile roles">
      <EditorSection
        title="Roles"
        description="The About page cycles through these in order. Hidden roles stay here but aren't shown."
      >
        <RepeatableList
          items={items}
          onChange={(next) => editor.update((v) => ({ ...v, items: next }), ['items'])}
          create={blankRole}
          itemLabel={(_, i) => `role ${i + 1}`}
          summary={(role) => (
            <>
              <span className="truncate font-medium text-fg">{role.label || 'Untitled role'}</span>
              {!role.visible && <Status>Hidden</Status>}
            </>
          )}
          addLabel="Add role"
          emptyLabel="No roles yet. The About page hides the role line until one is added."
          max={12}
        >
          {(role, i) => (
            <>
              <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
                <TextField label="Label" maxLength={80} {...editor.text(['items', i, 'label'])} />
                <SelectField
                  label="Accent"
                  value={role.accent}
                  options={ACCENT_OPTIONS}
                  onChange={(v) => editor.set(['items', i, 'accent'], v)}
                  error={editor.errorFor(['items', i, 'accent'])}
                />
              </div>
              <SwitchField label="Visible" checked={role.visible} onChange={(v) => editor.set(['items', i, 'visible'], v)} />
            </>
          )}
        </RepeatableList>
      </EditorSection>
    </EditorForm>
  );
}
