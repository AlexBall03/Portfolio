'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, StringListField, SwitchField, TextField } from '@/components/admin/form/fields';
import { LocaleTabs } from '@/components/admin/form/LocaleTabs';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { TechnologyPicker } from '@/components/admin/form/TechnologyPicker';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { ADMIN_PROJECTS_PATH, adminProjectPath } from '@/config/admin';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { errorsByLocale, localeStatuses } from '@/lib/cms/locale';
import { slugify } from '@/lib/cms/values';
import { historySettled } from '@/lib/client/history-guard';
import { createProject, deleteProject, saveProject } from '../../mutations';
import { projectTranslationInput } from '../../schema';
import type { ProjectValues, Technology } from '../../types';
import { publicProjectPath } from './ProjectStatus';

interface ProjectEditorProps {
  initial: ProjectValues;
  /** The shared technology vocabulary, for picking. */
  technologies: Technology[];
}

/**
 * A project's details: identity, links, bilingual copy, technologies, and
 * repositories, plus its publication state. Save keeps the status (a
 * published project's edits go live immediately); Publish / Unpublish save
 * the form with the other status.
 */
export function ProjectEditor({ initial, technologies }: ProjectEditorProps) {
  const router = useRouter();
  const editor = useEditor(initial, (values) => (values.id ? saveProject(values) : createProject(values)));
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const slugEdited = useRef(Boolean(initial.slug));
  const { values, baseline } = editor;
  const isNew = baseline.id === null;
  const live = baseline.status === 'published';
  const t = values.translations[locale];
  const en = values.translations.en;
  const path = (...rest: (string | number)[]) => ['translations', locale, ...rest];

  // A new project's first save created it: continue on its own page.
  useEffect(() => {
    const id = baseline.id;
    if (initial.id !== null || !id) return;
    void historySettled().then(() => router.replace(adminProjectPath(id)));
  }, [baseline.id, initial.id, router]);

  // Status, name, or URL changed: refresh the server-rendered header around the form.
  const shown = `${baseline.status}|${baseline.slug}|${baseline.translations.en.name}`;
  const lastShown = useRef(shown);
  useEffect(() => {
    if (lastShown.current === shown || isNew) return;
    lastShown.current = shown;
    router.refresh();
  }, [shown, isNew, router]);

  const onName = (name: string) => {
    editor.set(['translations', locale, 'name'], name);
    if (isNew && locale === DEFAULT_LOCALE && !slugEdited.current) editor.set(['slug'], slugify(name));
  };

  const onDelete = () =>
    startDelete(async () => {
      setDeleteError(undefined);
      const result = await deleteProject({ id: baseline.id, confirmSlug: baseline.slug });
      if (result.ok) {
        setConfirm(null);
        router.push(ADMIN_PROJECTS_PATH);
        router.refresh();
      } else {
        setDeleteError(result.fieldErrors.confirmSlug ?? result.formError);
      }
    });

  const publishButton = live ? (
    <button
      type="button"
      onClick={() => setConfirm('unpublish')}
      disabled={editor.pending}
      className={buttonStyles({ variant: 'secondary', size: 'sm' })}
    >
      Unpublish
    </button>
  ) : (
    <button
      type="button"
      onClick={() => editor.submit({ status: 'published' })}
      disabled={editor.pending}
      className={buttonStyles({ variant: 'secondary', size: 'sm' })}
    >
      {isNew ? 'Create & publish' : editor.dirty ? 'Save & publish' : 'Publish'}
    </button>
  );

  return (
    <>
      <EditorForm
        editor={editor}
        label={isNew ? 'New project' : 'Project details'}
        actions={publishButton}
        submitLabel={isNew ? 'Create draft' : live ? 'Save changes' : 'Save draft'}
        savedNote={live ? 'the public site is updated' : 'saved as a draft (not public)'}
        idleNote={isNew ? 'New project · not saved yet' : live ? 'Published · all changes saved' : 'Draft · not on the public site'}
      >
        <EditorSection title="Project" description="How the project is identified and presented.">
          <TextField
            label="URL slug"
            maxLength={80}
            hint={
              <>
                The public address: <span className="font-mono">{publicProjectPath(values.slug || '…')}</span>.
                {baseline.publishedAt && ' Changing it keeps the old address redirecting here.'}
              </>
            }
            {...editor.text(['slug'])}
            onChange={(v) => {
              slugEdited.current = true;
              editor.set(['slug'], v.toLowerCase());
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SwitchField
              label="Featured"
              hint="Shown first, as a large card. Order is set on the Order page."
              checked={values.featured}
              onChange={(v) => editor.set(['featured'], v)}
            />
            <SwitchField
              label="Live"
              hint="The project is deployed and reachable (shows a Live badge)."
              checked={values.isLive}
              onChange={(v) => editor.set(['isLive'], v)}
            />
          </div>
        </EditorSection>

        <EditorSection title="Content" description="Name and copy, in each language.">
          <LocaleTabs
            active={locale}
            onChange={setLocale}
            status={localeStatuses(projectTranslationInput, [values.translations])}
            errorCount={errorsByLocale(editor.errors)}
          >
            {(() => {
              const placeholder = (v: string) => (locale === DEFAULT_LOCALE ? undefined : v);
              return (
                <>
                  <TextField
                    label="Name"
                    maxLength={120}
                    placeholder={placeholder(en.name)}
                    {...editor.text(path('name'))}
                    onChange={onName}
                  />
                  <TextField
                    label="Tagline"
                    hint="One line under the name, on cards and the project page."
                    maxLength={200}
                    placeholder={placeholder(en.tagline)}
                    {...editor.text(path('tagline'))}
                  />
                  <TextField
                    label="Summary"
                    hint="The lead paragraph: what it is, and why it matters."
                    maxLength={2000}
                    multiline
                    rows={4}
                    placeholder={placeholder(en.summary)}
                    {...editor.text(path('summary'))}
                  />
                  <StringListField
                    label="Description"
                    hint="Optional paragraphs after the summary on the project page: approach, decisions, outcomes."
                    values={t.body}
                    onChange={(next) => editor.update((v) => ({ ...v, translations: { ...v.translations, [locale]: { ...v.translations[locale], body: next } } }), path('body'))}
                    errorAt={(i) => editor.errorFor(path('body', i))}
                    error={editor.errorFor(path('body'))}
                    placeholderAt={(i) => placeholder(en.body[i] ?? '')}
                    itemLabel={(i) => `Paragraph ${i + 1}`}
                    addLabel="Add paragraph"
                    max={12}
                    multiline
                    maxLength={2000}
                  />
                </>
              );
            })()}
          </LocaleTabs>
        </EditorSection>

        <EditorSection title="Links" description="Optional. Each one appears on the project page when set.">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Live demo" type="text" placeholder="https://" {...editor.text(['demoUrl'])} />
            <TextField label="Source code" placeholder="https://github.com/…" {...editor.text(['sourceUrl'])} />
            <TextField
              label="Write-up"
              hint="A README or case study, until the project page carries its own."
              placeholder="https://"
              {...editor.text(['detailsUrl'])}
              className="sm:col-span-2"
            />
          </div>
        </EditorSection>

        <EditorSection title="Technologies" description="In display order. New names are added to the shared technology list.">
          <TechnologyPicker
            options={technologies}
            chosen={values.technologies}
            onChange={(next) => editor.update((v) => ({ ...v, technologies: next }), ['technologies'])}
            error={editor.errorFor(['technologies'])}
          />
        </EditorSection>

        <EditorSection title="Repositories" description="GitHub repositories behind the project. The primary one is listed first.">
          <RepeatableList
            items={values.repositories}
            onChange={(next) => editor.update((v) => ({ ...v, repositories: next }), ['repositories'])}
            create={() => ({ key: newKey(), owner: '', name: '', isPrimary: values.repositories.length === 0 })}
            itemLabel={(r, i) => (r.owner && r.name ? `${r.owner}/${r.name}` : `repository ${i + 1}`)}
            summary={(r) => (
              <span className="truncate font-mono text-body-sm text-fg">{r.owner && r.name ? `${r.owner}/${r.name}` : 'New repository'}</span>
            )}
            addLabel="Add repository"
            emptyLabel="No repositories linked."
            max={10}
          >
            {(r, i) => (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Owner" placeholder="alexball" {...editor.text(['repositories', i, 'owner'])} />
                  <TextField label="Repository" placeholder="portfolio" {...editor.text(['repositories', i, 'name'])} />
                </div>
                <SwitchField
                  label="Primary repository"
                  checked={r.isPrimary}
                  onChange={(on) =>
                    editor.update(
                      (v) => ({ ...v, repositories: v.repositories.map((x, j) => ({ ...x, isPrimary: j === i ? on : on ? false : x.isPrimary })) }),
                      ['repositories'],
                    )
                  }
                />
              </>
            )}
          </RepeatableList>
          {editor.errorFor(['repositories']) && <FieldError>{editor.errorFor(['repositories'])}</FieldError>}
        </EditorSection>
      </EditorForm>

      {!isNew && (
        <section aria-labelledby="danger-zone" className="flex flex-col gap-3 rounded-md border border-danger/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="danger-zone" className="text-body-sm font-medium text-fg">
              Delete this project
            </h2>
            <p className="text-body-sm text-fg-muted">
              Removes it, its translations, and its images for good. To hide it instead, unpublish it.
            </p>
          </div>
          <button type="button" onClick={() => setConfirm('delete')} className={buttonStyles({ variant: 'danger', size: 'sm' })}>
            Delete project
          </button>
        </section>
      )}

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete project?"
        confirmLabel="Delete project"
        requireText={baseline.slug}
        pending={deleting}
        error={deleteError}
        onCancel={() => {
          setConfirm(null);
          setDeleteError(undefined);
        }}
        onConfirm={onDelete}
      >
        <p>
          <strong className="text-fg">{baseline.translations.en.name}</strong> will be removed permanently, with its
          translations and uploaded images. {live && 'Its public page will stop working immediately.'} This can’t be undone.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'unpublish'}
        title="Unpublish project?"
        tone="default"
        confirmLabel={editor.dirty ? 'Save & unpublish' : 'Unpublish'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          editor.submit({ status: 'draft' });
        }}
      >
        <p>It becomes a draft: its public page and card disappear until you publish it again. Nothing is deleted.</p>
      </ConfirmDialog>
    </>
  );
}
