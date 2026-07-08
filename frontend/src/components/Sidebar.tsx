import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Users2, BarChart3, LogOut, Activity } from 'lucide-react';
import { useAppSelector } from '../store';

export const Sidebar: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/log', label: 'Log Interaction', icon: PenTool },
    { to: '/doctors', label: 'HCP Directory', icon: Users2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Branding Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center glow-blue">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white leading-none text-base">BioPharma CRM</h1>
          <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">AI-First Module</span>
        </div>
      </div>

      {/* Nav Link Items */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile Segment */}
      {user && (
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-brand-400 border border-slate-700">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.role}</p>
          </div>
        </div>
      )}
    </aside>
  );
};
