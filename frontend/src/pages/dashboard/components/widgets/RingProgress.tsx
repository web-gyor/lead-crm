import React from 'react';

interface RingProgressProps {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}

export const RingProgress = React.memo(({ pct: p, size = 52, stroke = 4, color = "#059669" }: RingProgressProps) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(Math.max(p, 0), 100) / 100) * circ;
  
  return (
    <svg width={size} height={size} className="-rotate-90 select-none">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" className="dark:stroke-gray-800" />
      <circle
        cx={size / 2} 
        cy={size / 2} 
        r={r}
        stroke={color} 
        strokeWidth={stroke} 
        fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
    </svg>
  );
});

RingProgress.displayName = 'RingProgress';