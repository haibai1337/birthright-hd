const paths: Record<string, string> = {
  crown: 'm3 6 5 4 4-7 4 7 5-4-2 13H5L3 6Zm3 17h12',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
  sword: 'm5 21 4-4m-4-4 6 6m-4-5L18 3h3v3L10 17',
  scroll: 'M6 4h13v13a3 3 0 0 1-3 3H4a3 3 0 0 0 3-3V4a2 2 0 0 0-4 0v3h4m9 13a3 3 0 0 1-3-3h7',
  diplomacy: 'm2 10 6-5 4 2 4-2 6 5-6 9h-4l-6-5m3-6 3 4 4-4m-6 7 3 3m0-5 3 3',
  save: 'M4 3h14l3 3v15H3V3h1Zm3 0v7h10V3M7 21v-7h10v7',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-8 4H1m22 0h-3M12 4V1m0 22v-3M6 6 4 4m16 16-2-2M6 18l-2 2M20 4l-2 2',
  coin: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12',
  star: 'm12 2 2.8 6.5L22 9l-5.4 4.7L18 21l-6-3.7L6 21l1.4-7.3L2 9l7.2-.5L12 2Z',
  chevron: 'm8 4 8 8-8 8',
  close: 'm5 5 14 14M19 5 5 19',
  plus: 'M12 4v16M4 12h16',
  minus: 'M4 12h16',
  home: 'm3 10 9-8 9 8M5 9v12h14V9m-10 12v-7h6v7',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  castle: 'M3 21V8h5v4h8V8h5v13H3Zm0-13V4h2v4m3 0V4m8 4V4m5 4V4M10 21v-5h4v5',
  arrow: 'M3 12h18m-7-7 7 7-7 7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.star} />
    </svg>
  );
}
