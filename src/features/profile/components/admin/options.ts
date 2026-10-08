import { ICON_NAMES } from '@/components/ui/icons';
import type { Accent } from '@/features/skills/types';

export const ACCENT_OPTIONS: readonly { value: Accent; label: string }[] = [
  { value: 'blue', label: 'Blue (brand)' },
  { value: 'gold', label: 'Gold (accent)' },
];

export const ICON_OPTIONS = ICON_NAMES.map((name) => ({ value: name as string, label: name }));
