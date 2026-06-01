import React from 'react';

export const DashboardSkeleton = React.memo(() => {
  return (
    <div className="space-y-6 w-full select-none" aria-hidden="true">
      {/* HEADER BANNER SKELETON */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <div className="flex gap-2 w-1/4 justify-end">
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse w-20" />
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse w-24" />
        </div>
      </div>

      {/* KPI QUAD GRID SKELETON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4 shadow-3xs h-32 flex flex-col justify-between">
            <div className="w-9 h-9 bg-gray-50 dark:bg-gray-800/60 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-2 bg-gray-50 dark:bg-gray-800/60 rounded animate-pulse w-1/3" />
              <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
              <div className="h-2 bg-gray-50 dark:bg-gray-800/60 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ))}
      </div>

      {/* MID SECTION CHARTS CANVAS SKELETON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 h-[330px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 animate-pulse" />
        <div className="lg:col-span-8 h-[330px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 animate-pulse" />
      </div>
    </div>
  );
});

DashboardSkeleton.displayName = 'DashboardSkeleton';