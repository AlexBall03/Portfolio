'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { TextField } from '@/components/admin/form/fields';
import { LocaleTabs } from '@/components/admin/form/LocaleTabs';
import { useEditor } from '@/components/admin/form/use-editor';
import { ADMIN_CONTACT_PATH } from '@/config/admin';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { errorsByLocale, localeStatuses, worstStatus } from '@/lib/cms/locale';
import { savePageCopy } from '../../mutations';
import { sectionTranslationInput, seoTranslationInput } from '../../schema';
import { PAGES, SECTIONS, type PageCopyValues } from '../../types';
import { SectionCopyFields } from './SectionCopyFields';

/** One public page's copy: its search/share metadata and the headings of the sections it shows. */
export function PageCopyEditor({ initial }: { initial: PageCopyValues }) {
  const editor = useEditor(initial, savePageCopy);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const { seo, sections } = editor.values;
  const page = PAGES[initial.page];

  const seoStatus = localeStatuses(seoTranslationInput, [seo.translations]);
  const sectionStatus = localeStatuses(
    sectionTranslationInput,
    Object.values(sections).map((s) => s.translations),
  );
  const status = Object.fromEntries(LOCALES.map((l) => [l, worstStatus([seoStatus[l], sectionStatus[l]])])) as typeof seoStatus;
  const english = locale === DEFAULT_LOCALE ? undefined : seo.translations.en;

  return (
    <EditorForm editor={editor} label={`${page.label} page content`}>
      <LocaleTabs active={locale} onChange={setLocale} status={status} errorCount={errorsByLocale(editor.errors)}>
        <EditorSection
          title="Search and sharing"
          description="The page title and description search engines and link previews show. Not visible on the page itself."
        >
          <TextField
            label="Title (optional)"
            hint={
              initial.page === 'home'
                ? 'Leave blank to use your name and title.'
                : `Leave blank to use the page name (${page.label}).`
            }
            maxLength={70}
            placeholder={english?.seoTitle || undefined}
            {...editor.text(['seo', 'translations', locale, 'seoTitle'])}
          />
          <TextField
            label="Description"
            multiline
            rows={3}
            maxLength={200}
            placeholder={english?.seoDescription || undefined}
            {...editor.text(['seo', 'translations', locale, 'seoDescription'])}
          />
        </EditorSection>

        {page.sections.map((key) => {
          const section = SECTIONS[key];
          const value = sections[key];
          if (section.ownedBy === 'contact' || !value) {
            return (
              <EditorSection key={key} title={`${section.label} section`}>
                <p className="text-body-sm text-fg-muted">
                  This section&apos;s heading and introduction are edited in{' '}
                  <Link href={ADMIN_CONTACT_PATH} className="text-brand-fg underline-offset-4 hover:underline">
                    Contact
                  </Link>
                  .
                </p>
              </EditorSection>
            );
          }
          return (
            <EditorSection key={key} title={`${section.label} section`} description="Heading copy shown at the top of this section.">
              <SectionCopyFields editor={editor} base={['sections', key]} section={key} value={value} locale={locale} />
            </EditorSection>
          );
        })}
      </LocaleTabs>
    </EditorForm>
  );
}
