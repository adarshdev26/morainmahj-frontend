import React from "react";

export default function Logo({ variant = "full", size = "md", className = "", theme = "dark" }) {
  const sizes = {
    xs: { icon: 32, text: "text-lg" },
    sm: { icon: 40, text: "text-xl" },
    md: { icon: 56, text: "text-3xl" },
    lg: { icon: 80, text: "text-5xl" },
    xl: { icon: 120, text: "text-7xl" },
  };
  const s = sizes[size] || sizes.md;

  // theme="dark"  → navy lines/M on transparent (use on dark/navy backgrounds)
  // theme="light" → navy lines/M on white background (use on light/white backgrounds)
  const isLight = theme === "light";

  const Monogram = ({ iconSize }) => (
    <svg width={iconSize} height={iconSize} viewBox="0 0 120 120" fill="none">
      {isLight && (
        <circle cx="60" cy="60" r="58" fill="white" />
      )}
      <rect
        x="60" y="4" width="79" height="79"
        transform="rotate(45 60 4)"
        stroke={isLight ? "hsl(220, 40%, 20%)" : "currentColor"}
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="60" y="16" width="62" height="62"
        transform="rotate(45 60 16)"
        stroke={isLight ? "hsl(220, 40%, 20%)" : "currentColor"}
        strokeWidth="0.75"
        fill="none"
      />
      <text
        x="50%" y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontWeight="300"
        fontSize="52"
        fill={isLight ? "hsl(220, 40%, 20%)" : "currentColor"}
      >M</text>
    </svg>
  );

  if (variant === "icon") return <Monogram iconSize={s.icon} />;

  return (
    <div className={"inline-flex items-center gap-3 " + className}>
      <Monogram iconSize={s.icon} />
      <div className="flex flex-col">
        <span className={"font-heading font-light tracking-widest uppercase leading-none " + s.text}>
          Morain Mahj
        </span>
        <span className="font-body font-light tracking-[0.25em] uppercase text-xs opacity-50 mt-0.5">
          Legacy game for modern players
        </span>
      </div>
    </div>
  );
}