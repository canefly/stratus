import React from 'react';
import { useParserStore } from '../store/useParserStore';

export const Sidebar: React.FC = () => {
  const { 
    setNotesModalOpen, setLinkModalOpen, setSettingsModalOpen, 
    reset, content, notes, customNotes, showBadges,
    isTimelineHidden, setIsTimelineHidden, isDocTabsOpen, toggleDocTabs,
    links, checkedLinks, isCopyrightOpen, setCopyrightOpen
  } = useParserStore();
  const hasContent = !!content;
  const showSidebar = hasContent || isCopyrightOpen;

  if (!showSidebar) return null;

  const totalNotes = notes.length + customNotes.length;
  const totalLinks = links.length;
  const checkedLinksCount = links.filter(l => checkedLinks[l]).length;

  return (
    <div className="w-16 bg-[var(--glass-bg)] backdrop-blur-xl z-[60] flex flex-col items-center py-6 border-r border-[var(--glass-border)] flex-shrink-0 justify-between">
      <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex flex-col items-center gap-4 w-full px-2">
        <button 
          onClick={() => {
            setCopyrightOpen(false);
            if (hasContent) reset();
          }}
          className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl surface hover:bg-white dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all active:scale-95 group border-[var(--surface-border)]"
          title="Go Home / New Import"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        {hasContent && (
          <div className="flex flex-col items-center gap-4 w-full">
            <button 
              onClick={toggleDocTabs}
              className={`w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl surface transition-all active:scale-95 group border-[var(--surface-border)] ${
                isDocTabsOpen 
                  ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30 hover:bg-[var(--accent)]/20' 
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white dark:hover:bg-slate-800'
              }`}
              title="Document Tabs / Outline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h10M4 14h14M4 18h8" />
              </svg>
            </button>

            <button 
              onClick={() => setNotesModalOpen(true)}
              className="relative w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl surface hover:bg-white dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all active:scale-95 group border-[var(--surface-border)]"
              title="Editor Notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {showBadges && totalNotes > 0 && (
                <span className="notes-badge">{totalNotes}</span>
              )}
            </button>

            <button 
              onClick={() => setLinkModalOpen(true)}
              className="relative w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl surface hover:bg-white dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all active:scale-95 group border-[var(--surface-border)]"
              title={totalLinks > 0 ? `Source Links (${checkedLinksCount}/${totalLinks} checked)` : "Source Links"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {showBadges && totalLinks > 0 && (
                <span className={`notes-badge ${checkedLinksCount === totalLinks ? '!bg-emerald-500 !text-white' : '!bg-sky-500 !text-white'}`}>
                  {totalLinks}
                </span>
              )}
            </button>
          </div>
        )}
      </div></div>

      <div className="flex flex-col items-center pb-2 w-full px-2 gap-4">

        {hasContent && (
          <button
            onClick={() => setIsTimelineHidden(!isTimelineHidden)}
            className={`w-full aspect-square flex items-center justify-center rounded-xl surface transition-all active:scale-95 border-[var(--surface-border)] ${
              isTimelineHidden 
                ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30 hover:bg-[var(--accent)]/20' 
                : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white dark:hover:bg-slate-800'
            }`}
            title={isTimelineHidden ? "Show A-Roll Timeline (Split View)" : "Hide A-Roll Timeline (Focus Mode)"}
          >
            {isTimelineHidden ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            )}
          </button>
        )}

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="w-full aspect-square flex items-center justify-center rounded-xl surface text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 border-[var(--surface-border)]"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
