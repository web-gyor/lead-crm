import React from 'react';

interface SparkBarsProps {
  data: number[];
  color?: string;
}

export const SparkBars = React.memo(({ data, color = "#2563eb" }: SparkBarsProps) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-8 w-full select-none" aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-xs transition-all duration-500"
          style={{
            height: `${Math.max(8, Math.round((v / max) * 100))}%`,
            backgroundColor: i === data.length - 1 ? color : `${color}40`,
          }}
        />
      ))}
    </div>
  );
});

SparkBars.displayName = 'SparkBars';