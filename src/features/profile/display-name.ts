/** Splits "Alexander D. Ball" into "Alexander" / "D. Ball" for the two-line display name (hero, share card). */
export function displayName(fullName: string): [string, string] {
  const [first = fullName, ...rest] = fullName.split(' ');
  return [first, rest.join(' ')];
}

/** "Alexander D. Ball" → "AB": the first and last words that start with a letter (the no-photo placeholder). */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
