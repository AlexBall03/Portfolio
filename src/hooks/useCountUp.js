import { useRef, useState, useEffect } from 'react';
import { watchVisible } from './scrollWatcher';

export default function useCountUp(target, { duration = 1400, decimals = 0 } = {}) {
  const ref = useRef(null);
  const [val, setVal] = useState(target);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let stop;
    const arm = () => {
      stop = watchVisible(el, () => {
        setVal(0);
        const start = performance.now();
        let landed = false;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(target * eased);
          if (p < 1) requestAnimationFrame(tick);
          else { landed = true; setVal(target); }
        };
        requestAnimationFrame(tick);
        setTimeout(() => { if (!landed) setVal(target); }, duration + 400);
      }, { at: 0.82 });
    };
    if (window.__animReady) arm();
    else {
      const t = setTimeout(() => { if (window.__animReady) arm(); }, 140);
      stop = () => clearTimeout(t);
    }
    return () => stop?.();
  }, [target, duration]);

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  return [ref, display];
}
