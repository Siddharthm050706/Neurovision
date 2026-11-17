import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { healthService } from '../../api/healthService';
import { modelService } from '../../api/modelService';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/upload': 'MRI Upload',
  '/enhancement': 'Image Enhancement',
  '/processing': 'Tumor Segmentation',
  '/results': 'Results & Evaluation',
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const { health, currentJobId, setHealth, setModelInfo } = useAppStore();
  const [openMenu, setOpenMenu] = useState<'notifications' | 'profile' | null>(null);
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'NeuroVision';
  const isDashboard = location.pathname === '/';
  const isHealthy = health?.status === 'ok';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [healthRes, modelRes] = await Promise.all([
          healthService.getHealth(),
          modelService.getModelInfo(),
        ]);
        setHealth(healthRes);
        setModelInfo(modelRes);
      } catch (error) {
        console.warn('Backend connection error:', error);
        setHealth(null);
        setModelInfo(null);
      }
    };

    void fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [setHealth, setModelInfo]);

  useEffect(() => {
    setOpenMenu(null);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          {!isDashboard && (
            <div className="mb-0.5 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
              <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-teal-700">
                <LayoutDashboard className="h-3 w-3" />
                Dashboard
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate text-slate-500">{pageTitle}</span>
            </div>
          )}
          <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')}
            className={`relative rounded-lg p-2 transition-colors ${
              openMenu === 'notifications' ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            aria-label="System notifications"
            aria-expanded={openMenu === 'notifications'}
          >
            <Bell className="h-[18px] w-[18px]" />
            {!isHealthy && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />}
          </button>
          {openMenu === 'notifications' && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">System status</p>
                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  aria-label="Close notifications"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-3 text-xs">
                <p className="flex items-start gap-2.5 text-slate-600">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isHealthy ? 'bg-teal-500' : 'bg-amber-500'}`} />
                  {isHealthy ? 'Backend services are connected.' : 'Backend connection is unavailable.'}
                </p>
                <p className="flex items-start gap-2.5 text-slate-600">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${currentJobId ? 'bg-teal-500' : 'bg-slate-300'}`} />
                  {currentJobId ? 'An MRI job is active.' : 'No MRI job is active.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
            className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors ${
              openMenu === 'profile' ? 'bg-slate-100' : 'hover:bg-slate-100'
            }`}
            aria-label="Research workspace menu"
            aria-expanded={openMenu === 'profile'}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10243b] text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-xs font-semibold leading-4 text-slate-800">Research workspace</span>
              <span className="block text-[10px] leading-4 text-slate-500">NeuroVision</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 lg:block" />
          </button>
          {openMenu === 'profile' && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800">Research workspace</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Clinical imaging session</p>
              </div>
              <Link
                to="/"
                onClick={() => setOpenMenu(null)}
                className="mt-1 flex items-center rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-teal-800"
              >
                Dashboard
              </Link>
              <Link
                to="/upload"
                onClick={() => setOpenMenu(null)}
                className="flex items-center rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-teal-800"
              >
                Upload MRI
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
