// Cosmetic only. The command palette's key handler accepts either modifier, so
// guessing wrong here prints the wrong glyph on the trigger — it never breaks
// the shortcut. Not worth anything more elaborate than this.
const IS_MAC = typeof navigator !== 'undefined'
  && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const SHORTCUT_LABEL = IS_MAC ? '\u2318K' : 'Ctrl K';
