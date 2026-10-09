'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { StringListField, SwitchField, TextField } from '@/components/admin/form/fields';
import { useEditor } from '@/components/admin/form/use-editor';
import { saveProfileDetails } from '../../mutations';
import type { ProfileDetailsValues } from '../../types';

/** Profile facts and the copy around them. */
export function ProfileDetailsEditor({ initial }: { initial: ProfileDetailsValues }) {
  const editor = useEditor(initial, saveProfileDetails);
  const { values } = editor;
  const t = (field: string) => [field];

  return (
    <EditorForm editor={editor} label="Profile details">
      <EditorSection title="Identity" description="Name, contact, and location facts.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Full name" maxLength={120} autoComplete="name" {...editor.text(['fullName'])} />
          <TextField
            label="Short name"
            maxLength={80}
            hint="Used where the full name is too long, and as the JSON-LD alternate name."
            {...editor.text(['shortName'])}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            hint="Shown on the contact page."
            {...editor.text(['email'])}
          />
          <TextField
            label="Time zone"
            hint="IANA name, e.g. America/Phoenix. Drives the local-time readout."
            {...editor.text(['timeZone'])}
          />
          <TextField label="Region" hint="Optional, e.g. AZ (structured data)." maxLength={100} {...editor.text(['addressRegion'])} />
          <TextField
            label="Country"
            hint="Optional two-letter code, e.g. US (structured data)."
            maxLength={2}
            {...editor.text(['addressCountry'])}
          />
        </div>
        <SwitchField
          label="Open to work"
          hint="Shows the availability badge on the home page."
          checked={values.openToWork}
          onChange={(v) => editor.set(['openToWork'], v)}
        />
      </EditorSection>

      <EditorSection title="Copy" description="Headline, hero, and About text.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Title" maxLength={120} {...editor.text(t('title'))} />
          <TextField label="Availability text" maxLength={120} {...editor.text(t('availabilityText'))} />
          <TextField label="Location label" maxLength={120} {...editor.text(t('locationLabel'))} />
          <TextField label="Hero focus" maxLength={120} {...editor.text(t('heroFocus'))} />
        </div>
        <TextField label="Statement" multiline maxLength={300} {...editor.text(t('statement'))} />
        <TextField label="Hero stack line" maxLength={160} {...editor.text(t('heroStackLine'))} />
        <StringListField
          label="Hero chips"
          hint="Up to four short tags under the hero."
          values={values.heroChips}
          onChange={(chips) => editor.set(t('heroChips'), chips)}
          errorAt={(i) => editor.errorFor([...t('heroChips'), i])}
          error={editor.errorFor(t('heroChips'))}
          itemLabel={(i) => `Chip ${i + 1}`}
          addLabel="Add chip"
          max={4}
          maxLength={60}
        />
        <StringListField
          label="About"
          hint="One entry per paragraph."
          values={values.about}
          onChange={(about) => editor.set(t('about'), about)}
          errorAt={(i) => editor.errorFor([...t('about'), i])}
          error={editor.errorFor(t('about'))}
          itemLabel={(i) => `Paragraph ${i + 1}`}
          addLabel="Add paragraph"
          multiline
          maxLength={2000}
        />
      </EditorSection>
    </EditorForm>
  );
}
