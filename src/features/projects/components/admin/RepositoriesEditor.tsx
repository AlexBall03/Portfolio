'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { Status } from '@/components/ui/Status';
import { REPOSITORY_LABELS } from '@/features/github/labels';
import type { RepositoryLabel } from '@/features/github/types';
import { parseRepositoryRef } from '@/lib/github-repository';
import { saveProjectRepositories } from '../../mutations';
import { MAX_REPOSITORIES } from '../../schema';
import type { RepositoriesValues, RepositoryCheck, RepositoryRowValues } from '../../types';

const LABEL_NAMES: Record<RepositoryLabel, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  api: 'API',
  infrastructure: 'Infrastructure',
  mobile: 'Mobile',
  library: 'Library',
  docs: 'Documentation',
  other: 'Other',
};

const LABEL_OPTIONS: { value: RepositoryLabel | ''; label: string }[] = [
  { value: '', label: 'No label' },
  ...REPOSITORY_LABELS.map((value) => ({ value, label: LABEL_NAMES[value] })),
];

/** One row's GitHub status, as of the last load or save. Unsaved rows are checked on Save. */
function CheckNote({ check, saved }: { check: RepositoryCheck | undefined; saved: boolean }) {
  if (!saved) return <span className="text-micro text-fg-faint">Verified with GitHub on save</span>;
  if (!check) return null;
  switch (check.status) {
    case 'public':
      return (
        <span className="flex flex-wrap items-center gap-2">
          <Status tone="success">Public</Status>
          {check.archived && <Status>Archived</Status>}
          {check.renamedTo && (
            <span className="text-micro text-warning">
              Now <span className="font-mono">{check.renamedTo}</span> on GitHub; Save to update the name.
            </span>
          )}
        </span>
      );
    case 'private':
      return <span className="text-micro text-danger">Private on GitHub: hidden from the public page. Remove it or make it public.</span>;
    case 'not-found':
      return <span className="text-micro text-danger">Not found on GitHub (deleted or private): hidden from the public page.</span>;
    case 'unreachable':
      return <span className="text-micro text-warning">GitHub couldn’t be reached; the page shows cached data meanwhile.</span>;
    case 'unconfigured':
      return <span className="text-micro text-warning">GitHub isn’t configured (no token), so repositories can’t be checked.</span>;
  }
}

interface RepositoriesEditorProps {
  projectId: string;
  initial: RepositoriesValues;
}

/**
 * The project's GitHub repositories (owner/name or any github.com URL), their
 * labels and order, and whether the page shows analytics. Each new or changed
 * repository is verified against GitHub on Save: only public repositories, stored
 * by GitHub's stable id so renames keep working.
 */
export function RepositoriesEditor({ projectId, initial }: RepositoriesEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectRepositories({ projectId, ...values }));
  const { values, baseline } = editor;
  const savedInput = new Map(baseline.repositories.map((r) => [r.id, r.input]));
  const setRows = (next: RepositoryRowValues[]) => editor.update((v) => ({ ...v, repositories: next }), ['repositories']);

  return (
    <EditorForm editor={editor} label="GitHub repositories">
      <EditorSection
        title="Analytics"
        description="A “Development activity” section on the project page: commit activity, languages, contributors, releases, and recent commits from these repositories."
      >
        <SwitchField
          label="Show GitHub analytics on the project page"
          hint="Off until you turn it on. Preview always shows it (marked Hidden while off)."
          checked={values.analyticsVisible}
          onChange={(on) => editor.set(['analyticsVisible'], on)}
        />
      </EditorSection>

      <EditorSection
        title="Repositories"
        description="Public GitHub repositories behind the project, in display order. The primary one is listed first."
      >
        <RepeatableList
          items={values.repositories}
          onChange={setRows}
          create={(): RepositoryRowValues => ({ key: newKey(), input: '', label: '', isPrimary: values.repositories.length === 0 })}
          itemLabel={(r, i) => r.input || `repository ${i + 1}`}
          summary={(r) => {
            const ref = parseRepositoryRef(r.input);
            return (
              <>
                <span className="truncate font-mono text-body-sm text-fg">{ref ? `${ref.owner}/${ref.name}` : r.input || 'New repository'}</span>
                {r.isPrimary && <Status tone="brand">Primary</Status>}
                {r.label && <Status>{LABEL_NAMES[r.label]}</Status>}
              </>
            );
          }}
          addLabel="Add repository"
          emptyLabel="No repositories linked. The project page shows no GitHub section."
          max={MAX_REPOSITORIES}
          disabled={editor.pending}
        >
          {(r, i) => (
            <>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <TextField
                  label="Repository"
                  placeholder="owner/name or https://github.com/owner/name"
                  maxLength={300}
                  {...editor.text(['repositories', i, 'input'])}
                />
                <SelectField
                  label="Label"
                  value={r.label}
                  options={LABEL_OPTIONS}
                  onChange={(label) => editor.set(['repositories', i, 'label'], label)}
                  disabled={editor.pending}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SwitchField
                  label="Primary repository"
                  checked={r.isPrimary}
                  disabled={editor.pending}
                  onChange={(on) =>
                    editor.update(
                      (v) => ({
                        ...v,
                        repositories: v.repositories.map((x, j) => ({ ...x, isPrimary: j === i ? on : on ? false : x.isPrimary })),
                      }),
                      ['repositories'],
                    )
                  }
                />
                <CheckNote
                  check={r.id ? baseline.checks[r.id] : undefined}
                  saved={Boolean(r.id) && savedInput.get(r.id) === r.input}
                />
              </div>
            </>
          )}
        </RepeatableList>
        {editor.errorFor(['repositories']) && <FieldError>{editor.errorFor(['repositories'])}</FieldError>}
      </EditorSection>
    </EditorForm>
  );
}
