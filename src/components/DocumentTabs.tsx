import React, { useMemo, useState, useEffect } from 'react';
import { useParserStore } from '../store/useParserStore';

interface OutlineItem {
  id: number;
  text: string;
  level: number;
}

export const DocumentTabs: React.FC = () => {
  const content = useParserStore(state => state.content);
  const setIsDocTabsOpen = useParserStore(state => state.setIsDocTabsOpen);
  const [activeHeaderId, setActiveHeaderId] = useState<number | null>(null);

  // Parse blocks to find headers / outline items
  const { headings, tabs } = useMemo(() => {
    if (!content) return { headings: [], tabs: ['Tab 1'] };
    
    let blocks: any[] = [];
    try {
      blocks = JSON.parse(content);
    } catch (e) {
      return { headings: [], tabs: ['Tab 1'] };
    }

    const items: OutlineItem[] = [];
    const tabList: string[] = [];

    blocks.forEach((block: any) => {
      let isH = block.isHeader;
      let level = block.headerLevel || 1;
      const text = (block.text || '').trim();

      if (!text) return;

      // Fallback heading check if parser didn't mark it
      if (!isH) {
        if (text.length <= 60 && !text.endsWith('.')) {
          if (/^(lvl|level|chapter|section|tab|part|scene)\s*\d*/i.test(text)) {
            isH = true;
            if (/lvl\s*2|level\s*2/i.test(text)) level = 2;
            else if (/lvl\s*3|level\s*3/i.test(text)) level = 3;
            else level = 1;
          }
        }
      }

      if (isH) {
        if (/^tab\s+\d+/i.test(text) && !tabList.includes(text)) {
          tabList.push(text);
        }

        items.push({
          id: block.id,
          text,
          level: Math.min(Math.max(level, 1), 4)
        });
      }
    });

    return {
      headings: items,
      tabs: tabList.length > 0 ? tabList : ['Tab 1']
    };
  }, [content]);

  // Set initial active heading
  useEffect(() => {
    if (headings.length > 0 && activeHeaderId === null) {
      setActiveHeaderId(headings[0].id);
    }
  }, [headings, activeHeaderId]);

  // Ref to suppress scroll-spy updates during manual heading clicks
  const isManualClickRef = React.useRef(false);
  const clickTimeoutRef = React.useRef<any>(null);

  // Scroll spy to detect active heading on RawViewer scroll
  useEffect(() => {
    const rawViewer = document.getElementById('raw-viewer');
    if (!rawViewer || headings.length === 0) return;

    const handleScroll = () => {
      if (isManualClickRef.current) return;

      const viewerRect = rawViewer.getBoundingClientRect();
      const topThreshold = viewerRect.top + 90; // 90px threshold from top of raw viewer

      let currentActiveId = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(`block-${h.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= topThreshold) {
            currentActiveId = h.id;
          } else {
            break;
          }
        }
      }
      setActiveHeaderId(currentActiveId);
    };

    rawViewer.addEventListener('scroll', handleScroll, { passive: true });
    return () => rawViewer.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleHeadingClick = (id: number) => {
    setActiveHeaderId(id);
    isManualClickRef.current = true;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const rawViewer = document.getElementById('raw-viewer');
    const target = document.getElementById(`block-${id}`);

    if (rawViewer && target) {
      const containerRect = rawViewer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      // Subtract 44px for the sticky header bar height & breathing room
      const targetScrollTop = rawViewer.scrollTop + (targetRect.top - containerRect.top) - 44;

      rawViewer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

      target.classList.add('ring-2', 'ring-[var(--accent)]/50', 'rounded-lg');
      setTimeout(() => target.classList.remove('ring-2', 'ring-[var(--accent)]/50', 'rounded-lg'), 1500);
    }

    // Re-enable scroll spy after smooth scroll completes (~800ms)
    clickTimeoutRef.current = setTimeout(() => {
      isManualClickRef.current = false;
    }, 800);
  };

  return (
    <div className="w-64 h-full flex flex-col bg-[var(--surface-bg)] border-r border-[var(--glass-border)] flex-shrink-0 transition-all duration-300 animate-in slide-in-from-left-4 font-sans select-none">
      {/* Header */}
      <div className="p-3 border-b border-[var(--surface-border)]/50 flex items-center gap-2">
        <button
          onClick={() => setIsDocTabsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
          title="Collapse Document Tabs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight">Document tabs</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* Tab Card */}
        {tabs.map((tabName, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-[var(--pill-bg)] text-[var(--foreground)] font-medium shadow-sm border border-[var(--glass-border)]">
              <div className="flex items-center gap-2 overflow-hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate font-semibold text-[11px]">{tabName}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-muted)] opacity-60 cursor-pointer hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>

            {/* Hierarchical Outline Tree */}
            <div className="space-y-0.5 relative pl-1 border-l border-[var(--surface-border)]/30 ml-2 mt-1">
              {headings.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] italic">
                  No document headings detected
                </div>
              ) : (
                headings.map((item) => {
                  const isActive = item.id === activeHeaderId;
                  const indentClass = item.level === 1 ? 'pl-2' : item.level === 2 ? 'pl-5' : 'pl-7';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleHeadingClick(item.id)}
                      title={item.text}
                      className={`relative flex items-center py-1.5 pr-2 rounded-md cursor-pointer transition-all duration-150 group ${indentClass} ${
                        isActive
                          ? 'text-[var(--accent)] font-semibold bg-[var(--accent)]/10'
                          : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* Active Blue Indicator Bar (Google Docs style) */}
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-1 bg-[var(--accent)] rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                      )}

                      <span className="truncate text-[11px] leading-snug">
                        {item.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
