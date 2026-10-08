'use client';

import Image from 'next/image';
import Link from 'next/link';
import { SortableList } from '@/components/admin/form/SortableList';
import { FieldError } from '@/components/admin/form/fields';
import { buttonStyles } from '@/components/ui/button-styles';
import { adminProjectPath } from '@/config/admin';
import type { ProjectImageChoice } from '../../types';

interface ProjectImagePickerProps {
  projectId: string;
  images: ProjectImageChoice[];
  /** Chosen asset ids, in display order. */
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Chooses and orders images from the project's own media. Files are uploaded
 * (and their alt text and captions edited) on the Media tab; this only refers
 * to them, so one image can appear in several places without a copy.
 */
export function ProjectImagePicker({ projectId, images, value, onChange, error, disabled }: ProjectImagePickerProps) {
  const byId = new Map(images.map((i) => [i.assetId, i]));
  const chosen = value.filter((id) => byId.has(id)).map((id) => ({ key: id, image: byId.get(id)! }));
  const available = images.filter((i) => !value.includes(i.assetId));

  if (!images.length) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-body-sm text-fg-muted">
        This project has no images yet.{' '}
        <Link href={adminProjectPath(projectId, 'media')} className="text-brand-fg underline underline-offset-4">
          Upload them on the Media tab
        </Link>
        , then choose them here.
      </p>
    );
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-body-sm font-medium text-fg">Images</legend>
      <SortableList
        items={chosen}
        onChange={(next) => onChange(next.map((c) => c.key))}
        itemLabel={(c, i) => c.image.alt || `image ${i + 1}`}
        onRemove={(i) => onChange(value.filter((id) => id !== chosen[i]?.key))}
        disabled={disabled}
        emptyLabel="No images chosen yet."
      >
        {({ image }) => (
          <>
            <span className="relative block aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-sm border border-line bg-surface-inset">
              <Image src={image.src} alt="" fill sizes="96px" className="object-cover object-top" />
            </span>
            <span className="min-w-0 truncate text-body-sm text-fg">{image.alt || 'No alt text'}</span>
          </>
        )}
      </SortableList>
      {error && <FieldError>{error}</FieldError>}
      {available.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-micro text-fg-faint">Add from this project’s media (alt text and captions are edited on the Media tab):</p>
          <ul className="flex flex-wrap gap-2">
            {available.map((image) => (
              <li key={image.assetId}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange([...value, image.assetId])}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-auto gap-2 py-1.5 pl-1.5' })}
                >
                  <span className="relative block aspect-[16/10] w-14 overflow-hidden rounded-sm border border-line">
                    <Image src={image.src} alt="" fill sizes="56px" className="object-cover object-top" />
                  </span>
                  <span className="max-w-40 truncate">Add {image.alt || 'image'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </fieldset>
  );
}
