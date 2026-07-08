import React from 'react';

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl glass-card border border-slate-100 dark:border-slate-800 animate-pulse flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
      </div>
      <div className="w-16 h-8 bg-slate-300 dark:bg-slate-600 rounded"></div>
      <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
  );
};

export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/50">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="w-2/3 h-3 bg-slate-100 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
      ))}
    </div>
  );
};
