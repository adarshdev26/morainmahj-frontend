import React from "react";

/** Circular navy badge with diamond monogram + MORAIN / MAHJ wordmark. */
export default function LogoBadge({ size = 80, className = "" }) {
  return (
    <div
      className={`inline-flex shrink-0 overflow-hidden rounded-full shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Morain Mahj"
        className="block"
      >
        <circle cx="100" cy="100" r="100" fill="#1e2d4a" />

        {/* Nested viewBox keeps the monogram aligned at all sizes */}
        <svg x="45" y="28" width="110" height="86" viewBox="0 0 120 120">
          <rect
            x="60" y="4" width="79" height="79"
            transform="rotate(45 60 4)"
            stroke="white" strokeWidth="1.5" fill="none"
          />
          <rect
            x="60" y="16" width="62" height="62"
            transform="rotate(45 60 16)"
            stroke="white" strokeWidth="0.75" fill="none"
          />
          <text
            x="60" y="65"
            dominantBaseline="middle"
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="300"
            fontSize="52"
            fill="white"
          >
            M
          </text>
        </svg>

        <text
          x="100" y="142"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="14"
          fontWeight="600"
          letterSpacing="3"
          fill="white"
        >
          MORAIN
        </text>
        <text
          x="100" y="163"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="11"
          fontWeight="400"
          letterSpacing="2"
          fill="white"
          opacity="0.85"
        >
          MAHJ
        </text>
      </svg>
    </div>
  );
}
