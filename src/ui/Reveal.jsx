import { useRef, useEffect } from 'react';
import { watchVisible } from '../hooks/scrollWatcher';

export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style = {}, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return watchVisible(el, () => el.classList.add('in'), { at: 0.92 });
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--d': `${delay}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
