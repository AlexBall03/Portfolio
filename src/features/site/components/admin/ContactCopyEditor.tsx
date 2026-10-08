'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { LocaleTabs } from '@/components/admin/form/LocaleTabs';
import { useEditor } from '@/components/admin/form/use-editor';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { errorsByLocale, localeStatuses } from '@/lib/cms/locale';
import { saveContactCopy } from '../../mutations';
import { sectionTranslationInput } from '../../schema';
import type { SectionCopyEditorValues } from '../../types';
import { SectionCopyFields } from './SectionCopyFields';

/** The contact page's heading and introduction. */
export function ContactCopyEditor({ initial }: { initial: SectionCopyEditorValues }) {
  const editor = useEditor(initial, saveContactCopy);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  return (
    <EditorForm editor={editor} label="Contact copy">
      <LocaleTabs
        active={locale}
        onChange={setLocale}
        status={localeStatuses(sectionTranslationInput, [editor.values.translations])}
        errorCount={errorsByLocale(editor.errors)}
      >
        <EditorSection title="Introduction" description="Shown beside the contact form, above your email and links.">
          <SectionCopyFields editor={editor} base={[]} section="contact" value={editor.values} locale={locale} />
        </EditorSection>
      </LocaleTabs>
    </EditorForm>
  );
}
