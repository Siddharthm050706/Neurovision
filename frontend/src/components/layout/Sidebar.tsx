import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

const primaryItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { name: 'MRI Upload', path: '/upload', icon: Upload },
  { name: 'Image Enhancement', path: '/enhancement', icon: Sparkles },
  { name: 'Tumor Segmentation', path: '/processing', icon: Brain },
  { name: 'Results & Evaluation', path: '/results', icon: FileCheck2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}) => {
  const { currentJobId, segmentResult, resultRecord } = useAppStore();
  const location = useLocation();
  const hasSegmentation = Boolean(segmentResult || resultRecord);

  useEffect(() => {
    onCloseMobile();
  }, [location.pathname, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[#10243b] text-white shadow-xl transition-[width,transform] duration-200 lg:translate-x-0 lg:shadow-none ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-white/10 px-4 ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm shadow-teal-950/30">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-bold tracking-wide text-white">NeuroVision</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-300">Clinical Research</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 ${collapsed ? 'lg:hidden' : ''}`}>
            Workspace
          </p>
          {primaryItems.map(({ name, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              title={collapsed ? name : undefined}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-lg border px-3 text-[13px] transition-colors duration-150 ${
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                } ${
                  isActive
                    ? 'border-teal-400/30 bg-teal-500/15 font-semibold text-white shadow-sm shadow-slate-950/10'
                    : 'border-transparent text-slate-200 hover:bg-white/[0.07] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? 'text-teal-300' : 'text-slate-300 group-hover:text-teal-200'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={`min-w-0 flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{name}</span>
                  {name === 'Results & Evaluation' && hasSegmentation && (
                    <Activity className={`h-3.5 w-3.5 shrink-0 text-teal-300 ${collapsed ? 'lg:hidden' : ''}`} aria-label="Results available" />
                  )}
                  {name === 'MRI Upload' && currentJobId && (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300 ${collapsed ? 'lg:hidden' : ''}`} aria-label="MRI loaded" />
                  )}
                </>
              )}
            </NavLink>
          ))}

        </nav>

        <div className={`shrink-0 border-t border-white/10 p-3 ${collapsed ? 'lg:flex lg:justify-center' : ''}`}>
          <div className={`mb-3 rounded-lg bg-slate-950/25 p-3 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active session</p>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-300">MRI scan</span>
              <span className={currentJobId ? 'font-medium text-teal-300' : 'text-slate-400'}>
                {currentJobId ? 'Loaded' : 'None'}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-300">Segmentation</span>
              <span className={hasSegmentation ? 'font-medium text-teal-300' : 'text-slate-400'}>
                {hasSegmentation ? 'Ready' : 'Pending'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden min-h-10 w-full items-center justify-center gap-3 rounded-lg px-3 text-xs text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
