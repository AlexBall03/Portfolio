import { notFound } from 'next/navigation';

/** Exists only to return a 404, so there is no UI to validate for instant navigation. */
export const instant = false;

/** Any path that matches no route renders the localized not-found page. */
export default function CatchAll() {
  notFound();
}
