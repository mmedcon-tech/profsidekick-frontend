"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Users, BarChart2, LogOut, Bot,
  UserCircle, Store, Bookmark, History, BookOpen,
  Layers, ShieldCheck, Star, Menu, PanelLeftOpen,
  PanelLeftClose, Sun, Moon, Search, ChevronDown, Settings
} from 'lucide-react';

// ─── nav item types ──────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export type SidebarConfig = (NavItem | NavSection)[];

// ─── role-specific nav configs ───────────────────────────────────────────────

export const publisherNav: SidebarConfig = [
  { label: 'Dashboard',  href: '/publisher/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Avatar Studio',
    items: [
      { label: 'My Avatars', href: '/publisher/avatars', icon: <Bot size={18} /> },
    ],
  },
  {
    label: 'Courses & Sessions',
    items: [
      { label: 'My Courses', href: '/publisher/courses', icon: <BookOpen size={18} /> },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Session History', href: '/publisher/history', icon: <History size={18} /> },
      { label: 'Analytics',       href: '/publisher/analytics', icon: <BarChart2 size={18} /> },
    ],
  },
];

export const subscriberNav: SidebarConfig = [
  { label: 'Dashboard',       href: '/subscriber/dashboard',   icon: <LayoutDashboard size={18} /> },
  { label: 'Marketplace',      href: '/subscriber/marketplace', icon: <Store size={18} /> },
  { label: 'My Courses',       href: '/subscriber/courses',     icon: <BookOpen size={18} /> },
  { label: 'Avatar Preview',   href: '/subscriber/avatar-preview', icon: <Bot size={18} /> },
  { label: 'Learning History', href: '/subscriber/history',     icon: <History size={18} /> },
  { label: 'Profile',          href: '/subscriber/profile',     icon: <UserCircle size={18} /> },
];

export const adminNav: SidebarConfig = [
  { label: 'Overview', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    label: 'Content',
    items: [
      { label: 'Templates',   href: '/admin/templates',   icon: <Layers size={18} /> },
      { label: 'Marketplace', href: '/admin/marketplace', icon: <Star size={18} /> },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'Publishers',  href: '/admin/publishers',  icon: <ShieldCheck size={18} /> },
      { label: 'Subscribers', href: '/admin/subscribers', icon: <Users size={18} /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/admin/analytics', icon: <BarChart2 size={18} /> },
    ],
  },
];

// ─── Focus-mode routes ────────────────────────────────────────────────────────
function isFocusRoute(pathname: string): boolean {
  return (
    /\/sessions\/[^/]+\/chat/.test(pathname) ||
    /\/courses\/[^/]+\/sessions\/[^/]+\/run\//.test(pathname)
  );
}

function isSection(item: NavItem | NavSection): item is NavSection {
  return 'items' in item;
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function SidebarThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-full h-9 rounded-lg" aria-hidden="true" />;

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return collapsed ? (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors mb-2"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  ) : (
    <button
      type="button"
      aria-label={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors mb-2"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  nav: SidebarConfig;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  focusMode: boolean;
}

function Sidebar({ nav, open, onClose, collapsed, onToggleCollapse, focusMode }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const linkClass = (active: boolean) =>
    active
      ? 'bg-gray-800 text-white font-medium'
      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200';

  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? user?.username?.[0] ?? '')).toUpperCase() || '?';

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-gray-900 text-white flex flex-col z-30
          transform transition-all duration-200 ease-in-out
          ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          ${focusMode
            ? ''
            : `lg:translate-x-0 lg:static lg:z-auto ${collapsed ? 'lg:w-16' : 'lg:w-64'}`
          }
        `}
      >
        {/* ── Logo / header ───────────────────────────────────────────────── */}
        <div className={`
          flex items-center h-16 border-b border-gray-700 flex-shrink-0 transition-all
          ${collapsed ? 'lg:justify-center lg:px-0 px-5 justify-between' : 'px-5 justify-between'}
        `}>
          {/* Logo — hidden when collapsed on desktop */}
          <div className={`flex items-center gap-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <Image
              src="/images/logo.png"
              alt="MyOS"
              width={28}
              height={28}
              className="rounded-full object-contain flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="font-bold text-base">MyOS</span>
          </div>

          {/* Desktop collapse toggle */}
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile close button */}
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {nav.map((entry, i) => {
            if (!isSection(entry)) {
              const active = isActive(entry.href);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={onClose}
                  title={entry.label}
                  aria-label={entry.label}
                  className={`
                    flex items-center gap-2.5 rounded-lg text-sm transition-colors
                    ${collapsed ? 'lg:justify-center lg:p-2.5 px-3 py-2' : 'px-3 py-2'}
                    ${linkClass(active)}
                  `}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-blue-400' : ''}`}>{entry.icon}</span>
                  <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{entry.label}</span>
                </Link>
              );
            }

            return (
              <div key={i} className={i > 0 ? 'mt-4' : ''}>
                {/* Section label: full on mobile, hidden when desktop-collapsed */}
                <p className={`px-3 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest ${
                  collapsed ? 'lg:hidden' : ''
                }`}>
                  {entry.label}
                </p>
                {/* Divider replaces section label when desktop-collapsed */}
                {collapsed && i > 0 && (
                  <div className="hidden lg:block h-px bg-gray-700/50 mx-2 my-2" />
                )}
                {entry.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={onClose}
                      title={item.label}
                      aria-label={item.label}
                      className={`
                        flex items-center gap-2.5 rounded-lg text-sm transition-colors
                        ${collapsed ? 'lg:justify-center lg:p-2.5 px-3 py-2' : 'px-3 py-2'}
                        ${linkClass(active)}
                      `}
                    >
                      <span className={`flex-shrink-0 ${active ? 'text-blue-400' : ''}`}>{item.icon}</span>
                      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── User card ────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-gray-700 p-3">
          <SidebarThemeToggle collapsed={collapsed} />

          {collapsed ? (
            /* Collapsed: just avatar + logout */
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${user?.firstName} ${user?.lastName}`}
                className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-sm cursor-default"
              >
                {initials}
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            /* Expanded: full user card */
            <>
              <div className="flex items-center gap-3 mb-2 px-1">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? user?.username?.[0] ?? '')).toUpperCase() || '?';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          {initials}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
          {user?.firstName || user?.username}
        </span>
        <ChevronDown size={14} className="hidden sm:block text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <UserCircle size={14} />
            Profile
          </Link>
          <Link
            href="/profile?tab=security"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings size={14} />
            Settings
          </Link>
          <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  nav: SidebarConfig;
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ nav, children, title }: DashboardLayoutProps) {
  const pathname = usePathname();
  const focusMode = isFocusRoute(pathname ?? '');
  const { query, placeholder, isSearchActive, handleInput } = useSearch();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  // Close mobile sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar
        nav={nav}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        focusMode={focusMode}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {focusMode ? (
          <div className="flex-1 overflow-hidden relative group">
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open navigation"
              aria-label="Open navigation"
              className="
                absolute left-0 top-1/2 -translate-y-1/2 z-10
                flex items-center justify-center
                bg-gray-900 text-white
                rounded-r-lg px-1.5 py-3 shadow-lg
                opacity-0 group-hover:opacity-100
                transition-opacity duration-150
                pointer-events-none group-hover:pointer-events-auto
              "
            >
              <PanelLeftOpen size={14} />
            </button>
            {children}
          </div>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 lg:px-5 gap-3 flex-shrink-0">
              {/* Mobile hamburger */}
              <button
                className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>

              {/* Page title (when no search) */}
              {title && !isSearchActive && (
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                  {title}
                </h1>
              )}

              {/* Contextual search */}
              {isSearchActive && (
                <div className="flex-1 max-w-sm relative">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              )}

              <div className="flex-1" />
              <ProfileDropdown />
            </header>

            <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
              {children}
            </main>
          </>
        )}
      </div>
    </div>
  );
}
