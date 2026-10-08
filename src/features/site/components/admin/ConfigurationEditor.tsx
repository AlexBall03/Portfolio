'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { useEditor } from '@/components/admin/form/use-editor';
import { BrandMark } from '@/components/layout/BrandMark';
import { saveSiteSettings } from '../../mutations';
import type { SiteSettingsValues } from '../../types';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const;

/** Site-wide settings: branding, the GitHub integration, and the first-visit theme. */
export function ConfigurationEditor({ initial }: { initial: SiteSettingsValues }) {
  const editor = useEditor(initial, saveSiteSettings);
  const { values } = editor;
  const githubOff = !values.githubUsername.trim() || !values.showGithubSection;

  return (
    <EditorForm editor={editor} label="Site configuration">
      <EditorSection title="Branding" description="The wordmark in the navigation, footer, splash screen, and admin.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Brand mark"
            maxLength={40}
            hint={<>The characters &lt;/ \&gt; and - are drawn in the brand and accent colors.</>}
            {...editor.text(['brandMark'])}
          />
          <TextField label="Monogram" maxLength={20} hint="Short mark on the home page portrait card." {...editor.text(['monogram'])} />
        </div>
        <div
          aria-label="Preview"
          role="group"
          className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md border border-line bg-surface-inset/50 px-4 py-3"
        >
          <span className="font-mono text-micro tracking-[0.16em] text-fg-faint uppercase">Preview</span>
          <BrandMark text={values.brandMark || ' '} className="text-body" />
          <BrandMark text={values.monogram || ' '} className="text-label" />
        </div>
      </EditorSection>

      <EditorSection title="GitHub" description="The live activity section on the Projects page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="GitHub username"
            maxLength={39}
            hint="Leave blank to have no GitHub account (the section is hidden)."
            {...editor.text(['githubUsername'])}
          />
        </div>
        <SwitchField
          label="Show the GitHub section"
          hint={githubOff ? 'The section is currently hidden on the public site.' : 'The section is shown on the public site.'}
          checked={values.showGithubSection}
          onChange={(v) => editor.set(['showGithubSection'], v)}
        />
      </EditorSection>

      <EditorSection title="Appearance">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Default theme"
            hint="For first-time visitors; anyone who picks a theme keeps their own choice."
            value={values.defaultTheme}
            options={THEME_OPTIONS}
            onChange={(v) => editor.set(['defaultTheme'], v)}
            error={editor.errorFor(['defaultTheme'])}
          />
        </div>
      </EditorSection>
    </EditorForm>
  );
}
