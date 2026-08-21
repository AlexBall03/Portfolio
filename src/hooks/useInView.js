import { useRef, useState, useEffect } from 'react';
import { watchVisible } from './scrollWatcher';

export default function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return watchVisible(el, () => setSeen(true), { at: 0.85 });
  }, [threshold]);
  return [ref, seen];
}
