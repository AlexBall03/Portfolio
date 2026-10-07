import type { Locale } from './config';
import { en, type Dictionary } from './dictionaries/en';
import { es } from './dictionaries/es';

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale];
export type { Dictionary };
