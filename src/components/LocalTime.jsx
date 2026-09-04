import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatPhoenixTime } from '../utils/datetime';

// Kept as its own leaf component so the once-a-minute tick re-renders this span
// alone, not the whole Hero with its headshot and reveal animations.
export default function LocalTime({ className = 'hero-localtime' }) {
  const { locale } = useApp();
  const [time, setTime] = useState(() => formatPhoenixTime(locale));

  useEffect(() => {
    let interval;
    const tick = () => setTime(formatPhoenixTime(locale));

    tick(); // re-format immediately when the locale changes

    // Line the first update up with the next wall-clock minute so the digits
    // flip when the minute actually turns instead of drifting off page load.
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));

    // Background tabs throttle timers, so resync the moment the tab is visible
    // again rather than showing a stale minute for up to a minute.
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [locale]);

  return <span className={className}>{time}</span>;
}
