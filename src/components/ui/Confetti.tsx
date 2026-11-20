import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';

const COLORS = [
  'var(--color-brand-soft)',
  'var(--color-accent)',
  'var(--color-cyan)',
  'var(--color-mint)',
  'var(--color-amber)',
];

const PIECES = 90;
const LIFETIME_MS = 2900;

interface Piece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  size: number;
  color: string;
  round: boolean;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECES }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.45,
    duration: 1.9 + Math.random() * 0.9,
    drift: (Math.random() - 0.5) * 36,
    rotate: 360 + Math.random() * 900,
    size: 6 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
    round: Math.random() > 0.65,
  }));
}

/**
 * Renders one burst and removes itself. Mount it with a changing `key` to
 * fire it again; the parent decides whether animations are allowed at all.
 */
export function Confetti(): ReactElement | null {
  const pieces = useMemo(() => makePieces(), []);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDone(true), LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (done) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="animate-fall absolute top-0 block"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * (piece.round ? 1 : 1.6)}px`,
            background: piece.color,
            borderRadius: piece.round ? '50%' : '2px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--dx' as string]: `${piece.drift}vw`,
            ['--dr' as string]: `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
