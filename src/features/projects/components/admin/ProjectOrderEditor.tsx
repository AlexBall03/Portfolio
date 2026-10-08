'use client';

import Link from 'next/link';
import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SortableList } from '@/components/admin/form/SortableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { adminProjectPath } from '@/config/admin';
import { cn } from '@/lib/cn';
import { saveProjectOrder } from '../../mutations';
import type { ProjectOrderItem, ProjectOrderValues } from '../../types';
import { ProjectStatusPill } from './ProjectStatus';

const toggle =
  'inline-flex h-8 items-center rounded-sm px-2.5 text-body-sm text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-50';

/**
 * Editorial order. The public Projects page shows featured projects first, as
 * large cards, then the rest; each group follows the order here. Drafts can
 * be placed before they are published.
 */
export function ProjectOrderEditor({ initial }: { initial: ProjectOrderValues }) {
  const editor = useEditor(initial, saveProjectOrder);
  const { featured, other } = editor.values;

  const setGroup = (group: keyof ProjectOrderValues, items: ProjectOrderItem[]) =>
    editor.update((v) => ({ ...v, [group]: items }), [group]);

  const moveAcross = (from: keyof ProjectOrderValues, index: number) => {
    const to = from === 'featured' ? 'other' : 'featured';
    editor.update((v) => {
      const item = v[from][index]!;
      // Promoted projects join the end of Featured; demoted ones lead the rest.
      return {
        ...v,
        [from]: v[from].filter((_, i) => i !== index),
        [to]: to === 'featured' ? [...v[to], item] : [item, ...v[to]],
      } as ProjectOrderValues;
    });
  };

  const renderItem = (group: keyof ProjectOrderValues, item: ProjectOrderItem, i: number) => (
    <>
      <Link href={adminProjectPath(item.id)} className="truncate text-body-sm font-medium text-fg hover:text-brand-fg">
        {item.name}
      </Link>
      {item.status !== 'published' && <ProjectStatusPill status={item.status} />}
      <button
        type="button"
        onClick={() => moveAcross(group, i)}
        disabled={editor.pending}
        className={cn(toggle, 'ml-auto')}
        aria-label={group === 'featured' ? `Stop featuring ${item.name}` : `Feature ${item.name}`}
      >
        {group === 'featured' ? 'Unfeature' : 'Feature'}
      </button>
    </>
  );

  return (
    <EditorForm editor={editor} label="Project order" submitLabel="Save order" savedNote="the public order is updated">
      <EditorSection title="Featured" description="Large cards at the top of the Projects page, in this order.">
        <SortableList
          items={featured}
          onChange={(items) => setGroup('featured', items)}
          itemLabel={(item) => item.name}
          disabled={editor.pending}
          emptyLabel="No featured projects. Feature one below."
        >
          {(item, i) => renderItem('featured', item, i)}
        </SortableList>
      </EditorSection>
      <EditorSection title="All other projects" description="Compact cards after the featured ones, in this order.">
        <SortableList
          items={other}
          onChange={(items) => setGroup('other', items)}
          itemLabel={(item) => item.name}
          disabled={editor.pending}
          emptyLabel="Every project is featured."
        >
          {(item, i) => renderItem('other', item, i)}
        </SortableList>
      </EditorSection>
    </EditorForm>
  );
}
