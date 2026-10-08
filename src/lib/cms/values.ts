/** Structural equality for JSON-like form values (dirty tracking). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/** A location in a form value: `['translations', 'es', 'title']` ↔ the error key `translations.es.title`. */
export type Path = readonly (string | number)[];

export const pathKey = (path: Path) => path.join('.');

export function getIn(value: unknown, path: Path): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

/** Immutable set: copies only the containers along `path`. */
export function setIn<T>(value: T, path: Path, next: unknown): T {
  if (!path.length) return next as T;
  const [head, ...rest] = path;
  const container = (value ?? (typeof head === 'number' ? [] : {})) as Record<string | number, unknown>;
  const copy = (Array.isArray(container) ? [...container] : { ...container }) as Record<string | number, unknown>;
  copy[head!] = setIn(container[head!], rest, next);
  return copy as T;
}

/** Drops error entries at or below `path` (after an edit, a removal, or a reorder). */
export function clearErrorsAt(errors: Record<string, string>, path: Path): Record<string, string> {
  const key = pathKey(path);
  const kept = Object.entries(errors).filter(([k]) => k !== key && !k.startsWith(`${key}.`));
  return kept.length === Object.keys(errors).length ? errors : Object.fromEntries(kept);
}
