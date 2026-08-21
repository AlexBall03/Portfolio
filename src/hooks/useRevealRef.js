import { useRef, useEffect } from 'react';
import { watchVisible } from './scrollWatcher';

export default function useRevealRef(at = 0.85) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return watchVisible(el, () => el.classList.add('in'), { at });
  }, []);
  return ref;
}
