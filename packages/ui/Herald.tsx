import type { Scenario } from '../core/schema';
export function Herald({ realm, size = 54 }: { realm: Scenario['realms'][number]; size?: number }) {
  return (
    <svg
      className="herald"
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      aria-hidden="true"
    >
      <path
        fill={realm.color}
        stroke="currentColor"
        strokeWidth="3"
        d="M8 5h84v65c0 22-25 38-42 45C33 108 8 92 8 70Z"
      />
      <path
        d="M14 11h72v58c0 17-20 32-36 39-16-7-36-22-36-39Z"
        fill="none"
        stroke="currentColor"
        strokeWidth=".7"
        opacity=".5"
      />
      {realm.sigil === 'crown' ? (
        <path fill="currentColor" d="m24 32 13 10 13-20 13 20 13-10-5 34H29Zm7 42h38v8H31Z" />
      ) : realm.sigil === 'tower' ? (
        <path
          fill="currentColor"
          d="M30 30h10v10h7V30h9v10h7V30h10v23l-7 6v27H37V59l-7-6Zm15 38v18h13V68Z"
        />
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
          <path d="m49 85-10-22 3-19 10-5 10 7-2 19-9 20M42 44 28 30l-3-15m12 24 1-20m21 24 15-14 1-15m-10 24-1-20" />
          <path d="m31 32-11-2m52 0 10-4" />
        </g>
      )}
    </svg>
  );
}
