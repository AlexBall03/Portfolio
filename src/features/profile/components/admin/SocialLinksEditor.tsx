'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { Icon } from '@/components/ui/Icon';
import { Status } from '@/components/ui/Status';
import { PLATFORM_ICONS } from '@/components/layout/types';
import { saveSocialLinks } from '../../mutations';
import type { SocialLinkValues, SocialPlatform } from '../../types';

const PLATFORM_OPTIONS: readonly { value: SocialPlatform; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
];

const blankLink = (): SocialLinkValues => ({
  key: newKey(),
  platform: 'website',
  label: '',
  url: '',
  handle: '',
  visible: true,
});

/** Public profile links: nav, footer, contact page, command palette, and JSON-LD `sameAs`. */
export function SocialLinksEditor({ initial }: { initial: SocialLinkValues[] }) {
  const editor = useEditor({ items: initial }, saveSocialLinks);
  const items = editor.values.items;
  const path = (i: number, field: keyof SocialLinkValues) => ['items', i, field];

  return (
    <EditorForm editor={editor} label="Social links">
      <EditorSection
        title="Links"
        description="Shown in this order everywhere. Labels are proper nouns, so they aren't translated. Links open in a new tab."
      >
        <RepeatableList
          items={items}
          onChange={(next) => editor.update((v) => ({ ...v, items: next }), ['items'])}
          create={blankLink}
          itemLabel={(l, i) => l.label || `link ${i + 1}`}
          summary={(link) => (
            <>
              <Icon name={PLATFORM_ICONS[link.platform]} className="size-4 shrink-0 text-brand-fg" />
              <span className="truncate font-medium text-fg">{link.label || 'Untitled link'}</span>
              {!link.visible && <Status>Hidden</Status>}
            </>
          )}
          addLabel="Add link"
          emptyLabel="No links yet. The site shows only the email address until one is added."
          max={12}
        >
          {(link, i) => (
            <>
              <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                <SelectField
                  label="Platform"
                  hint="Chooses the icon."
                  value={link.platform}
                  options={PLATFORM_OPTIONS}
                  onChange={(v) => editor.set(path(i, 'platform'), v)}
                  error={editor.errorFor(path(i, 'platform'))}
                />
                <TextField label="Label" maxLength={40} placeholder="GitHub" {...editor.text(path(i, 'label'))} />
              </div>
              <div className="grid gap-5 sm:grid-cols-[1fr_14rem]">
                <TextField label="URL" type="url" placeholder="https://" {...editor.text(path(i, 'url'))} />
                <TextField
                  label="Handle"
                  hint="Optional. Shown instead of the URL."
                  maxLength={80}
                  placeholder="@handle"
                  {...editor.text(path(i, 'handle'))}
                />
              </div>
              <SwitchField label="Visible" checked={link.visible} onChange={(v) => editor.set(path(i, 'visible'), v)} />
            </>
          )}
        </RepeatableList>
      </EditorSection>
    </EditorForm>
  );
}
