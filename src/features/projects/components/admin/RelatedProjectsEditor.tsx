'use client';

import { useState } from 'react';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { FieldError, SelectField } from '@/components/admin/form/fields';
import { SortableList } from '@/components/admin/form/SortableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { buttonStyles } from '@/components/ui/button-styles';
import { MAX_RELATED, RELATED_SHOWN } from '../../case-study';
import { saveProjectRelations } from '../../mutations';
import type { ProjectChoice, RelatedValues } from '../../types';
import { ProjectStatusPill } from './ProjectStatus';

interface RelatedProjectsEditorProps {
  projectId: string;
  initial: RelatedValues;
  /** Every other project, whatever its status. */
  choices: ProjectChoice[];
}

/**
 * Explicit "related projects" for this project's page, in order. Any project
 * can be picked; the public page shows only the published ones (the first
 * few), so a draft can be lined up before it goes live.
 */
export function RelatedProjectsEditor({ projectId, initial, choices }: RelatedProjectsEditorProps) {
  const editor = useEditor(initial, (values) => saveProjectRelations({ projectId, ...values }));
  const byId = new Map(choices.map((c) => [c.id, c]));
  const related = editor.values.related.filter((r) => byId.has(r.id));
  const available = choices.filter((c) => !related.some((r) => r.id === c.id));
  const [adding, setAdding] = useState('');
  const pick = adding && available.some((c) => c.id === adding) ? adding : (available[0]?.id ?? '');

  const setRelated = (next: RelatedValues['related']) => editor.update((v) => ({ ...v, related: next }), ['related']);

  return (
    <EditorForm editor={editor} label="Related projects">
      <EditorSection
        title="Related projects"
        description={`Shown at the end of this project’s page as cards. Only published projects appear there, at most ${RELATED_SHOWN}, in this order.`}
      >
        <SortableList
          items={related}
          onChange={setRelated}
          itemLabel={(r) => byId.get(r.id)?.name ?? 'project'}
          onRemove={(i) => setRelated(related.filter((_, j) => j !== i))}
          disabled={editor.pending}
          emptyLabel="No related projects. The section is left off the page."
        >
          {(r) => {
            const p = byId.get(r.id)!;
            return (
              <>
                <span className="truncate font-medium text-fg">{p.name}</span>
                <span className="font-mono text-micro text-fg-faint">/{p.slug}</span>
                <ProjectStatusPill status={p.status} />
              </>
            );
          }}
        </SortableList>
        {editor.errorFor(['related']) && <FieldError>{editor.errorFor(['related'])}</FieldError>}

        {available.length > 0 && related.length < MAX_RELATED && (
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Add a project"
              value={pick}
              options={available.map((c) => ({ value: c.id, label: c.status === 'published' ? c.name : `${c.name} (not published)` }))}
              onChange={setAdding}
              className="min-w-64"
            />
            <button
              type="button"
              disabled={!pick || editor.pending}
              onClick={() => {
                setRelated([...related, { key: pick, id: pick }]);
                setAdding('');
              }}
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mb-0.5' })}
            >
              Add
            </button>
          </div>
        )}
      </EditorSection>
    </EditorForm>
  );
}
