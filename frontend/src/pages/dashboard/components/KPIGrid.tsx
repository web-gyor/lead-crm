import React from 'react';

interface KPIGridProps {
  children: React.ReactNode;
}

export const KPIGrid = React.memo(({ children }: KPIGridProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full auto-rows-fr">
      {children}
    </div>
  );
});

KPIGrid.displayName = 'KPIGrid';