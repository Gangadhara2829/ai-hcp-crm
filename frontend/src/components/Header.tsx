import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Bell, ShieldCheck } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store';
import { toggleTheme } from '../store/themeSlice';

export const Header: React.FC = () => {
  const location = useLocation();
  const theme = useAppSelector((state) => state.theme.mode);
  const dispatch = useAppDispatch();

  // Route titles mapping
  const getTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Medical Representative Dashboard';
      case '/log':
        return 'Log HCP Interaction';
      case '/doctors':
        return 'Healthcare Professionals Directory';
      default:
        return 'AI First Healthcare CRM';
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 transition-colors duration-200">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">
        {getTitle()}
      </h2>
      
      <div className="flex items-center gap-4">
        {/* Connection Status Icon */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local CRM Engine Online</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Dummy Notification bell */}
        <button className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500"></span>
        </button>
      </div>
    </header>
  );
};
