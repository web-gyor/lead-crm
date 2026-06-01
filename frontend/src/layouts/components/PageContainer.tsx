import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer = React.memo(({ children }: PageContainerProps) => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-50/60 dark:bg-[#0f172a] transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">
        {children}
      </div>
    </main>
  );
});

PageContainer.displayName = 'PageContainer';