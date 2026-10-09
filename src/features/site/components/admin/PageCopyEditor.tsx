'use client';

import Link from 'next/link';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { TextField } from '@/components/admin/form/fields';
import { useEditor } from '@/components/admin/form/use-editor';
import { ADMIN_CONTACT_PATH } from '@/config/admin';
import { savePageCopy } from '../../mutations';
import { PAGES, SECTIONS, type PageCopyValues } from '../../types';
import { SectionCopyFields } from './SectionCopyFields';

/** One public page's copy: its search/share metadata and the headings of the sections it shows. */
export function PageCopyEditor({ initial }: { initial: PageCopyValues }) {
  const editor = useEditor(initial, savePageCopy);
  const { sections } = editor.values;
  const page = PAGES[initial.page];

  return (
    <EditorForm editor={editor} label={`${page.label} page content`}>
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
          {...editor.text(['seo', 'seoTitle'])}
        />
        <TextField
          label="Description"
          multiline
          rows={3}
          maxLength={200}
          {...editor.text(['seo', 'seoDescription'])}
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
            <SectionCopyFields editor={editor} base={['sections', key]} section={key} />
          </EditorSection>
        );
      })}
    </EditorForm>
  );
}
