import React, { useId } from 'react';

interface Logo3RProps {
  className?: string;
  variant?: 'badge' | 'mark';
}

/**
 * Logo HD Vektor 3R (REDUCE, REUSE, RECYCLE) — tajam di semua ukuran & layar Retina
 */
export const Logo3R: React.FC<Logo3RProps> = ({
  className = 'w-10 h-10',
}) => {
  const uid = useId().replace(/:/g, '');
  const topId = `logo3r-top-${uid}`;
  const blId = `logo3r-bl-${uid}`;
  const brId = `logo3r-br-${uid}`;

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} aspect-square shrink-0 select-none`}
      role="img"
      aria-label="Logo 3R (Reduce, Reuse, Recycle)"
    >
      <title>3R — Reduce, Reuse, Recycle</title>

      {/* Outer crisp white edge + rich green ring + inner white circle */}
      <circle cx="100" cy="100" r="98" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="94" fill="#007A3E" />
      <circle cx="100" cy="100" r="56" fill="#FFFFFF" />

      <defs>
        <path id={topId} d="M 38 61 A 72 72 0 0 1 162 61" />
        <path id={blId} d="M 18 113 A 83 83 0 0 0 84 181" />
        <path id={brId} d="M 113 182 A 83 83 0 0 0 183 105" />
      </defs>

      <text
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="18.5"
        fontWeight="800"
        letterSpacing="1.5"
      >
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          REDUCE
        </textPath>
      </text>

      <text
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="1.5"
      >
        <textPath href={`#${blId}`} startOffset="50%" textAnchor="middle">
          REUSE
        </textPath>
      </text>

      <text
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="18"
        fontWeight="800"
        letterSpacing="1.2"
      >
        <textPath href={`#${brId}`} startOffset="50%" textAnchor="middle">
          RECYCLE
        </textPath>
      </text>

      {/* Classic folded 3R triangular arrows inside white center */}
      <g transform="translate(0, 2)">
        {[0, 120, 240].map(angle => (
          <g key={angle} transform={`rotate(${angle} 100 100)`}>
            <path
              d="M 80 82 L 91 65 C 94 61 98 61 101 64 L 91 88 Z"
              fill="#007A3E"
            />
            <path
              d="M 94 64 C 98 60 104 61 108 66 L 122 88 L 128 84 L 124 101 L 107 97 L 112 94 L 96 69 Z"
              fill="#007A3E"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
};
