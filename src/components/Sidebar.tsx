import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlaySquare,
  FileSpreadsheet,
  Layers,
  Users,
  ShieldAlert,
  BookOpen,
  Train,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
}) => {
  const { user, isMasterAdmin } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Analytics Dashboard',
      icon: LayoutDashboard,
      roles: ['MASTER_ADMIN', 'USER'],
    },
    {
      id: 'trial-processor',
      label: 'Trial Run Processor',
      icon: PlaySquare,
      badge: 'Core',
      roles: ['MASTER_ADMIN', 'USER'],
    },
    {
      id: 'reports',
      label: 'Trial History & Reports',
      icon: FileSpreadsheet,
      roles: ['MASTER_ADMIN', 'USER'],
    },
    {
      id: 'fleet',
      label: 'Loco Fleet & OEM Registry',
      icon: Layers,
      roles: ['MASTER_ADMIN', 'USER'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      badge: 'Admin',
      roles: ['MASTER_ADMIN'],
    },
    {
      id: 'audit-logs',
      label: 'Security Audit Logs',
      icon: ShieldAlert,
      badge: 'Admin',
      roles: ['MASTER_ADMIN'],
    },
    {
      id: 'docs',
      label: 'System Documentation',
      icon: BookOpen,
      roles: ['MASTER_ADMIN', 'USER'],
    },
  ];

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      className={`relative z-20 bg-slate-900/95 border-r border-slate-800 transition-all duration-300 flex flex-col shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand logo & header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Train className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-1.5">
                LocoTrails <span className="text-amber-400 font-semibold text-xs">PRO</span>
              </span>
              <span className="text-[10px] text-slate-400 block truncate font-mono">
                Indian Railways Traction
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Train className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ${
            collapsed ? 'hidden' : 'block'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-2 mb-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Operations & Analysis
            </span>
          )}
        </div>

        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 text-left flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : item.badge === 'Admin'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isMasterAdmin
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
            }`}
          >
            {isMasterAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </div>

          {!collapsed && (
            <div className="truncate flex-1">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user?.fullName || user?.username}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                {isMasterAdmin ? (
                  <span className="text-amber-400 font-semibold">MASTER ADMIN</span>
                ) : (
                  <span className="text-cyan-400">TRIAL OFFICER</span>
                )}
              </div>
            </div>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full mt-2 py-1 flex justify-center text-slate-500 hover:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
