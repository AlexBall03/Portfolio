'use client';

import { useId, useState } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/cms/values';
import { CONTROL, FieldError } from './fields';
import { SortableList } from './SortableList';

/** A shared-vocabulary technology (`technologies` row). */
export interface TechnologyOption {
  slug: string;
  name: string;
}

/** A chosen technology; `key` is its slug. */
export type ChosenTechnology = TechnologyOption & { key: string };

interface TechnologyPickerProps {
  options: TechnologyOption[];
  chosen: ChosenTechnology[];
  onChange: (next: ChosenTechnology[]) => void;
  error?: string;
}

/** Ordered technologies: pick an existing one (or type a new name), drag or move to reorder. */
export function TechnologyPicker({ options, chosen, onChange, error }: TechnologyPickerProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const available = options.filter((o) => !chosen.some((c) => c.slug === o.slug));

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    const existing = options.find((o) => o.name.toLowerCase() === name.toLowerCase() || o.slug === slugify(name));
    const tech = existing ?? { slug: slugify(name), name };
    if (tech.slug && !chosen.some((c) => c.slug === tech.slug)) onChange([...chosen, { key: tech.slug, ...tech }]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-3">
      <SortableList
        items={chosen}
        onChange={onChange}
        itemLabel={(t) => t.name}
        onRemove={(i) => onChange(chosen.filter((_, j) => j !== i))}
        emptyLabel="No technologies yet."
      >
        {(t) => (
          <>
            <span className="text-body-sm text-fg">{t.name}</span>
            {!options.some((o) => o.slug === t.slug) && <span className="font-mono text-micro text-accent-fg uppercase">New</span>}
          </>
        )}
      </SortableList>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-body-sm font-medium text-fg">
          Add a technology
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            list={`${id}-options`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Start typing, e.g. TypeScript"
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            className={cn(CONTROL, 'max-w-sm')}
          />
          <datalist id={`${id}-options`}>
            {available.map((o) => (
              <option key={o.slug} value={o.name} />
            ))}
          </datalist>
          <button type="button" onClick={add} disabled={!draft.trim()} className={buttonStyles({ variant: 'secondary', size: 'md' })}>
            Add
          </button>
        </div>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
