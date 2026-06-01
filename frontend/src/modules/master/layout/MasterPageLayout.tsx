// src/components/master/layout/MasterPageLayout.tsx
import React from 'react';

interface MasterPageLayoutProps {
  header?: React.ReactNode;
  statsRow?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export const MasterPageLayout: React.FC<MasterPageLayoutProps> = ({
  header,
  statsRow,
  toolbar,
  children
}) => {
  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {header && <div className="mb-2">{header}</div>}
      {statsRow && <div className="w-full">{statsRow}</div>}
      
      {/* 🚀 FLAT ARCHITECTURE LAYOUT CONTAINER — REMOVED DUPLICATE WHITE BACKGROUND WRAPPERS */}
      <div className="w-full space-y-4">
        {toolbar && <div className="w-full">{toolbar}</div>}
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
};