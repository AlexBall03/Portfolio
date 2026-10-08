'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { LocaleTabs, TranslationBadge } from '@/components/admin/form/LocaleTabs';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { Status } from '@/components/ui/Status';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { blankLocales, errorsByLocale, localeStatuses, translationStatus } from '@/lib/cms/locale';
import { saveProfileRoles } from '../../mutations';
import { roleTranslationInput } from '../../schema';
import type { RoleValues } from '../../types';
import { ACCENT_OPTIONS } from './options';

const blankRole = (): RoleValues => ({
  key: newKey(),
  accent: 'blue',
  visible: true,
  translations: blankLocales(() => ({ label: '' })),
});

/** The rotating role list on the About page. */
export function ProfileRolesEditor({ initial }: { initial: RoleValues[] }) {
  const editor = useEditor({ items: initial }, saveProfileRoles);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const items = editor.values.items;

  return (
    <EditorForm editor={editor} label="Profile roles">
      <EditorSection
        title="Roles"
        description="The About page cycles through these in order. Hidden roles stay here but aren't shown."
      >
        <LocaleTabs
          active={locale}
          onChange={setLocale}
          status={localeStatuses(roleTranslationInput, items.map((r) => r.translations))}
          errorCount={errorsByLocale(editor.errors)}
        >
          <RepeatableList
            items={items}
            onChange={(next) => editor.update((v) => ({ ...v, items: next }), ['items'])}
            create={blankRole}
            itemLabel={(_, i) => `role ${i + 1}`}
            summary={(role) => (
              <>
                <span className="truncate font-medium text-fg">{role.translations.en.label || 'Untitled role'}</span>
                {!role.visible && <Status>Hidden</Status>}
                <TranslationBadge locale={locale} status={translationStatus(roleTranslationInput, role.translations[locale])} />
              </>
            )}
            addLabel="Add role"
            emptyLabel="No roles yet. The About page hides the role line until one is added."
            max={12}
          >
            {(role, i) => (
              <>
                <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
                  <TextField
                    label="Label"
                    maxLength={80}
                    placeholder={locale === DEFAULT_LOCALE ? undefined : role.translations.en.label}
                    {...editor.text(['items', i, 'translations', locale, 'label'])}
                  />
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
        </LocaleTabs>
      </EditorSection>
    </EditorForm>
  );
}
