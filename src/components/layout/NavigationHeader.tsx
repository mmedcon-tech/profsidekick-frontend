"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, ChevronDown, Home } from 'lucide-react';

export default function NavigationHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Don't show navigation on public pages
  const publicPages = ['/', '/about', '/contact', '/login', '/register'];
  const isPublicPage = publicPages.includes(pathname);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect to login even if logout API fails
      router.push('/login');
    }
  };



  const handleHome = () => {
    router.push('/');
  };

  if (!isAuthenticated || !user || isPublicPage) {
    return null;
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Home */}
          <button
            onClick={handleHome}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/images/logo.png" 
              alt="ProfSidekick Logo" 
              className="w-10 h-10 object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-2xl font-bold text-blue-900">ProfSidekick</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Sessions are now created within courses */}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  user?.role === 'subscriber' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  <User size={16} className={`${
                    user?.role === 'subscriber' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                </div>
                <span className="hidden sm:block font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <ChevronDown size={16} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    {/* User Info */}
                    <div className="p-4 border-b border-gray-200">
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.email && (
                        <p className="text-sm text-gray-500">{user.email}</p>
                      )}
                      {user.role && (
                        <p className={`text-xs font-medium mt-1 px-2 py-1 rounded-full inline-block ${
                          user.role === 'subscriber'
                            ? 'bg-green-100 text-green-800'
                            : user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'subscriber' ? 'Subscriber' : user.role === 'admin' ? 'Admin' : 'Publisher'}
                        </p>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/profile');
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <User size={16} />
                        Settings
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <Home size={16} />
                        Dashboard
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 