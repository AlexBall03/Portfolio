'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { useEditor } from '@/components/admin/form/use-editor';
import { saveContactCopy } from '../../mutations';
import type { SectionCopyValues } from '../../types';
import { SectionCopyFields } from './SectionCopyFields';

/** The contact page's heading and introduction. */
export function ContactCopyEditor({ initial }: { initial: SectionCopyValues }) {
  const editor = useEditor(initial, saveContactCopy);

  return (
    <EditorForm editor={editor} label="Contact copy">
      <EditorSection title="Introduction" description="Shown beside the contact form, above your email and links.">
        <SectionCopyFields editor={editor} base={[]} section="contact" />
      </EditorSection>
    </EditorForm>
  );
}
