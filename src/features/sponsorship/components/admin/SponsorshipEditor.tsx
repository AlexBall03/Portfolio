'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { saveSponsorshipSettings } from '../../mutations';
import { MAX_HOME_SPONSORS, MAX_SUPPORT_ITEMS } from '../../schema';
import { sponsorName } from '../../sponsors';
import type { HiddenSponsor, Sponsor, SponsorshipValues } from '../../types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'alphabetical', label: 'Alphabetical' },
] as const;

interface SponsorshipEditorProps {
  initial: SponsorshipValues;
  /** GitHub's current public sponsors, or null when they couldn't be read. */
  sponsors: Sponsor[] | null;
}

/** Sponsorship settings: what is switched on, the copy, the button, and which sponsors are shown. */
export function SponsorshipEditor({ initial, sponsors }: SponsorshipEditorProps) {
  const editor = useEditor(initial, saveSponsorshipSettings);
  const { values } = editor;
  const off = !values.enabled;
  const listOff = off || !values.showSponsors;

  const hidden = values.hiddenSponsors;
  const isHidden = (id: number) => hidden.some((h) => h.githubId === id);
  const setHidden = (next: HiddenSponsor[]) => editor.set(['hiddenSponsors'], next);
  const toggle = (sponsor: Sponsor, show: boolean) =>
    setHidden(show ? hidden.filter((h) => h.githubId !== sponsor.id) : [...hidden, { githubId: sponsor.id, login: sponsor.login }]);
  // Hidden accounts GitHub no longer lists (or couldn't list): still stored, so they stay hidden if they return.
  const stale = hidden.filter((h) => !sponsors?.some((s) => s.id === h.githubId));

  return (
    <EditorForm editor={editor} label="Sponsorship settings">
      <EditorSection title="Visibility" description="What the public site shows. Turning sponsorship off hides all of it.">
        <SwitchField
          label="Enable sponsorship"
          hint={off ? 'Off: no home section, no support page, no sponsor lists.' : 'On: the parts below are shown where they are switched on.'}
          checked={values.enabled}
          onChange={(v) => editor.set(['enabled'], v)}
        />
        <SwitchField
          label="Show the home page section"
          checked={values.showHomeSection}
          disabled={off}
          onChange={(v) => editor.set(['showHomeSection'], v)}
        />
        <SwitchField
          label="Enable the support page"
          hint="/support, linked from the footer and the command palette. Off, the address is a 404."
          checked={values.supportPageEnabled}
          disabled={off}
          onChange={(v) => editor.set(['supportPageEnabled'], v)}
        />
      </EditorSection>

      <EditorSection title="Home section" description="The heading and message of the sponsorship panel on the home page.">
        <TextField label="Heading" maxLength={120} {...editor.text(['heading'])} />
        <TextField label="Description" multiline rows={4} maxLength={600} {...editor.text(['description'])} />
      </EditorSection>

      <EditorSection title="Call to action" description="The button on the home section and the support page.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Button label" maxLength={40} {...editor.text(['ctaLabel'])} />
          <TextField
            label="GitHub Sponsors URL"
            type="url"
            hint="https://github.com/sponsors/<username>. Public sponsors are read for this account."
            {...editor.text(['sponsorsUrl'])}
          />
        </div>
      </EditorSection>

      <EditorSection title="Sponsors" description="Public sponsors come from GitHub automatically. Private sponsors, tiers, and amounts are never read.">
        <SwitchField
          label="Show public sponsors"
          hint="A preview on the home section and the full list on the support page."
          checked={values.showSponsors}
          disabled={off}
          onChange={(v) => editor.set(['showSponsors'], v)}
        />
        <SwitchField
          label="Show the sponsor count"
          checked={values.showSponsorCount}
          disabled={listOff}
          onChange={(v) => editor.set(['showSponsorCount'], v)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Home page preview limit"
            type="number"
            hint={`How many sponsors the home section shows (1–${MAX_HOME_SPONSORS}). The support page lists everyone.`}
            disabled={listOff}
            {...editor.text(['homeSponsorLimit'])}
          />
          <SelectField
            label="Order"
            value={values.sponsorSort}
            options={SORT_OPTIONS}
            disabled={listOff}
            onChange={(v) => editor.set(['sponsorSort'], v)}
            error={editor.errorFor(['sponsorSort'])}
          />
        </div>

        <fieldset disabled={listOff} className="flex min-w-0 flex-col gap-3">
          <legend className="mb-3 text-body-sm font-medium text-fg">Sponsors on this site</legend>
          <p className="-mt-2 text-micro text-fg-faint">
            Hiding a sponsor only removes them from this site (and its count). Their GitHub sponsorship is not changed.
          </p>
          {sponsors === null && (
            <p className="rounded-md border border-dashed border-line-strong px-4 py-4 text-body-sm text-fg-muted">
              The sponsor list couldn&apos;t be read from GitHub right now (see the status above). Hidden sponsors stay hidden.
            </p>
          )}
          {sponsors?.length === 0 && stale.length === 0 && (
            <p className="rounded-md border border-dashed border-line-strong px-4 py-4 text-body-sm text-fg-muted">
              No public sponsors yet. They will appear here as GitHub lists them.
            </p>
          )}
          {(sponsors?.length || stale.length > 0) && (
            <ul className="divide-y divide-line rounded-md border border-line">
              {sponsors?.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <SwitchField
                    label={sponsorName(s)}
                    hint={`@${s.login}${s.kind === 'organization' ? ' · Organization' : ''} · ${isHidden(s.id) ? 'Hidden' : 'Shown'}`}
                    checked={!isHidden(s.id)}
                    disabled={listOff}
                    onChange={(show) => toggle(s, show)}
                  />
                </li>
              ))}
              {stale.map((h) => (
                <li key={h.githubId} className="px-4 py-3">
                  <SwitchField
                    label={`@${h.login}`}
                    hint={sponsors ? 'Hidden · not a public sponsor at the moment' : 'Hidden'}
                    checked={false}
                    disabled={listOff}
                    onChange={() => setHidden(hidden.filter((o) => o.githubId !== h.githubId))}
                  />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </EditorSection>

      <EditorSection title="Support page" description="The introduction and the list of what sponsorship supports. Plain text.">
        <TextField label="Page heading (h1)" maxLength={120} {...editor.text(['supportTitle'])} />
        <TextField label="Introduction" multiline rows={5} maxLength={600} {...editor.text(['supportIntro'])} />
        <RepeatableList
          items={values.supportItems}
          onChange={(items) => editor.update((v) => ({ ...v, supportItems: items }), ['supportItems'])}
          create={() => ({ key: newKey(), title: '', body: '' })}
          itemLabel={(_, i) => `Item ${i + 1}`}
          summary={(item) => <span className="truncate font-medium text-fg">{item.title || 'Untitled'}</span>}
          addLabel="Add item"
          emptyLabel="No items. The page shows the introduction and the button only."
          max={MAX_SUPPORT_ITEMS}
        >
          {(_, i) => (
            <>
              <TextField label="Title" maxLength={80} {...editor.text(['supportItems', i, 'title'])} />
              <TextField label="Description" multiline rows={2} maxLength={300} {...editor.text(['supportItems', i, 'body'])} />
            </>
          )}
        </RepeatableList>
      </EditorSection>
    </EditorForm>
  );
}
