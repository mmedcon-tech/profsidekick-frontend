import React from 'react';
import { Volume2, Languages, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex w-full">
      {/* Left Pane - Dark Background */}
      <div className="hidden lg:flex w-1/2 bg-primary dark:bg-primary/90 relative flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-80 pointer-events-none"></div>
        
        {/* Header row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#A88C4B] rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                <ShieldCheck size={24} />
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight">MyOS</span>
                <span className="text-xs text-primary/20/80 uppercase tracking-wide leading-none">AI Training Assistant</span>
             </div>
          </div>
          {/* <button className="flex items-center gap-2 border border-white/20 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
            <Languages size={16} />
            العربية
          </button> */}
        </div>


        {/* Footer */}
        <div className="relative z-10 text-xs text-white/50 font-medium">
          © 2026 MyOS. All rights reserved.
        </div>
      </div>

      {/* Right Pane - White */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 dark:bg-gray-900 p-8 sm:p-12 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}


