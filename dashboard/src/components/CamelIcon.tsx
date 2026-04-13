export default function CamelIcon({ size = 80, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <path
        d="M 28 105 L 28 78 C 28 68 34 62 44 60 C 50 59 54 54 58 47 C 63 39 70 34 79 33 C 88 32 95 37 99 44 C 103 51 107 56 114 57 C 122 58 128 64 128 74 L 128 105"
        fill="currentColor"
      />
      {/* Neck */}
      <path
        d="M 104 55 C 107 46 112 38 118 32 C 122 28 128 25 134 26 C 140 27 145 31 147 37 C 149 43 147 50 142 53 C 137 56 131 54 127 50 C 123 46 116 50 108 56 Z"
        fill="currentColor"
      />
      {/* Snout */}
      <path
        d="M 145 37 C 152 37 157 40 157 44 C 157 48 152 50 145 49 L 143 42 Z"
        fill="currentColor"
      />
      {/* Ear */}
      <path d="M 130 26 C 128 18 134 15 138 21 L 136 27 Z" fill="currentColor" />
      {/* Eye */}
      <circle cx="137" cy="34" r="2.5" fill="rgba(255,255,255,0.25)" />
      {/* Tail */}
      <path d="M 30 72 Q 18 64 16 52 Q 15 43 20 40" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Legs - 4 separate rects */}
      <rect x="38" y="102" width="9" height="30" rx="4.5" fill="currentColor" />
      <rect x="54" y="102" width="9" height="30" rx="4.5" fill="currentColor" />
      <rect x="96" y="102" width="9" height="30" rx="4.5" fill="currentColor" />
      <rect x="112" y="102" width="9" height="30" rx="4.5" fill="currentColor" />
    </svg>
  );
}
