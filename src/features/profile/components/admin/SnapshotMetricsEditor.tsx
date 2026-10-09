'use client';

import { EditorForm, EditorSection } from '@/components/admin/form/EditorForm';
import { SelectField, SwitchField, TextField } from '@/components/admin/form/fields';
import { newKey, RepeatableList } from '@/components/admin/form/RepeatableList';
import { useEditor } from '@/components/admin/form/use-editor';
import { Icon } from '@/components/ui/Icon';
import { Status } from '@/components/ui/Status';
import { saveSnapshotMetrics } from '../../mutations';
import type { MetricValues, SnapshotMetricSource } from '../../types';
import { ACCENT_OPTIONS, ICON_OPTIONS } from './options';

const SOURCE_OPTIONS: readonly { value: SnapshotMetricSource; label: string }[] = [
  { value: 'static', label: 'Fixed value' },
  { value: 'published_projects', label: 'Count of published projects' },
  { value: 'technologies', label: 'Count of stack technologies' },
];

const blankMetric = (): MetricValues => ({
  key: newKey(),
  icon: 'spark',
  label: '',
  note: '',
  source: 'static',
  value: 0,
  suffix: '',
  accent: 'blue',
  visible: true,
});

/** Keeps a typed number, or the raw text while it isn't one (validation then says so). */
const toNumber = (text: string): number | string => {
  const n = Number(text);
  return text.trim() === '' || Number.isNaN(n) ? text : n;
};

/** The About page snapshot tiles. */
export function SnapshotMetricsEditor({ initial }: { initial: MetricValues[] }) {
  const editor = useEditor({ items: initial }, saveSnapshotMetrics);
  const items = editor.values.items;
  const at = (i: number, ...rest: (string | number)[]) => ['items', i, ...rest];

  return (
    <EditorForm editor={editor} label="Snapshot metrics">
      <EditorSection
        title="Snapshot metrics"
        description="Counted metrics are computed from published content whenever it changes, so they can't drift from the portfolio."
      >
        <RepeatableList
          items={items}
          onChange={(next) => editor.update((v) => ({ ...v, items: next }), ['items'])}
          create={blankMetric}
          itemLabel={(_, i) => `metric ${i + 1}`}
          summary={(m) => (
            <>
              <Icon name={m.icon} className="size-4 shrink-0 text-accent-fg" />
              <span className="truncate font-medium text-fg">{m.label || 'Untitled metric'}</span>
              {m.source !== 'static' && <Status tone="brand">Counted</Status>}
              {!m.visible && <Status>Hidden</Status>}
            </>
          )}
          addLabel="Add metric"
          emptyLabel="No metrics yet. The snapshot section stays empty until one is added."
          max={8}
        >
          {(m, i) => {
            const derived = m.source !== 'static';
            return (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="Label" maxLength={60} {...editor.text(at(i, 'label'))} />
                  <TextField
                    label="Note"
                    hint="Optional small print under the label."
                    maxLength={120}
                    {...editor.text(at(i, 'note'))}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <SelectField
                    label="Source"
                    value={m.source}
                    options={SOURCE_OPTIONS}
                    onChange={(v) => editor.set(at(i, 'source'), v)}
                    error={editor.errorFor(at(i, 'source'))}
                  />
                  <TextField
                    label="Value"
                    type="number"
                    inputMode="decimal"
                    disabled={derived}
                    hint={derived ? 'Counted from published content.' : undefined}
                    {...editor.text(at(i, 'value'))}
                    onChange={(v) => editor.set(at(i, 'value'), toNumber(v))}
                  />
                  <TextField label="Suffix" hint="E.g. + or %." maxLength={4} {...editor.text(at(i, 'suffix'))} />
                  <SelectField
                    label="Icon"
                    value={m.icon}
                    options={ICON_OPTIONS}
                    onChange={(v) => editor.set(at(i, 'icon'), v)}
                    error={editor.errorFor(at(i, 'icon'))}
                  />
                  <SelectField
                    label="Accent"
                    value={m.accent}
                    options={ACCENT_OPTIONS}
                    onChange={(v) => editor.set(at(i, 'accent'), v)}
                    error={editor.errorFor(at(i, 'accent'))}
                  />
                </div>
                <SwitchField label="Visible" checked={m.visible} onChange={(v) => editor.set(at(i, 'visible'), v)} />
              </>
            );
          }}
        </RepeatableList>
      </EditorSection>
    </EditorForm>
  );
}
