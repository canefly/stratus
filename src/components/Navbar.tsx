import React from 'react';
import { useParserStore } from '../store/useParserStore';

export const Navbar: React.FC = () => {
  const { content, showCopied } = useParserStore();

  const hasContent = !!content;

  return (
    <div className="h-16 surface z-50 flex items-center justify-between px-6 flex-shrink-0 border-b border-[#ffffff1a]">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
          Stratus
        </h1>
        <a 
          href="https://github.com/canefly/stratus" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-[#020617] text-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-[#020617] dark:border-slate-700 hover:bg-slate-900 dark:hover:bg-slate-700 transition-colors"
        >
          canefly/stratus
        </a>
      </div>
      
      <div className="flex items-center gap-4">
        {hasContent && (
          <>
            <div id="auto-save-indicator" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500 opacity-0 transition-opacity duration-500 mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Saved
            </div>

            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-500 transition-all duration-300 mr-2 ${showCopied ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </div>
          </>
        )}
      </div>
    </div>
  );
};
