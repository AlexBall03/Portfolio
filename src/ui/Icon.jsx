const ICONS = {
  arrowRight:  'M5 12h14M13 6l6 6-6 6',
  arrowDown:   'M12 5v14M6 13l6 6 6-6',
  arrowUpRight:'M7 17 17 7M8 7h9v9',
  external:    'M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5',
  download:    'M12 3v12M7 10l5 5 5-5M5 21h14',
  mail:        'M3 6.5h18v11H3zM3 7l9 6 9-6',
  check:       'M20 6 9 17l-5-5',
  code:        'M8 6l-6 6 6 6M16 6l6 6-6 6',
  terminal:    'M4 5h16v14H4zM7 9l3 3-3 3M13 15h4',
  database:    'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  server:      'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
  layers:      'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  briefcase:   'M3 8h18v12H3zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18',
  cap:         'M3 9l9-4 9 4-9 4-9-4zM7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5',
  mic:         'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  music:       'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  globe:       'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21M12 3C9.5 5.5 8.2 8.7 8.2 12s1.3 6.5 3.8 9',
  languages:   'M3 5h10M8 3v2c0 4-2.5 7-6 8M5 9c0 2.5 2.5 4.5 6 5M13 19l4-9 4 9M14.5 16h5',
  spark:       'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  rocket:      'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2.2 0-3s-2.2-.8-3 0zM9 13l-2-2c1-4 4-7 9-7 0 5-3 8-7 9zM14 7.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0z',
  github:      'M9 19c-4.3 1.3-4.3-2.2-6-2.7M21 16v3.2c0 .8-.5 1.5-1.5 1.5-3.2.3-6.5.3-6.5-3.2 0-1 .3-1.7.8-2.2-3.3-.4-6.8-1.6-6.8-7.2 0-1.5.5-2.7 1.3-3.7-.1-.4-.6-1.8.1-3.7 0 0 1.1-.3 3.6 1.4a12.3 12.3 0 0 1 6.6 0c2.5-1.7 3.6-1.4 3.6-1.4.7 1.9.2 3.3.1 3.7.8 1 1.3 2.2 1.3 3.7 0 5.6-3.5 6.8-6.8 7.2.5.5 1 1.4 1 2.8z',
  linkedin:    'M4.5 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zM10 9h3v1.7c.6-1 1.8-1.9 3.5-1.9 2.7 0 4.5 1.7 4.5 5.2V21h-3v-6.3c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.5-.1.3-.1.7-.1 1V21h-3z',
  branch:      'M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 6a3 3 0 1 0 0-0.01M18 9a3 3 0 1 0 0-0.01M18 9c0 4-3 5-6 6',
  star:        'M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z',
  menu:        'M4 7h16M4 12h16M4 17h16',
  x:           'M6 6l12 12M18 6 6 18',
  calendar:    'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4',
  award:       'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM9 12l-2 8 5-3 5 3-2-8',
  user:        'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  bolt:        'M13 3 4 14h6l-1 7 9-11h-6z',
  pin:         'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  gauge:       'M12 13a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9zM12 13l4-4',
  shield:      'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  cube:        'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  sun:         'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  moon:        'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
};

export default function Icon({ name, className, style }) {
  const d = ICONS[name];
  if (!d) return null;
  const filled = name === 'github';
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} fillRule="evenodd" />
      ))}
    </svg>
  );
}
