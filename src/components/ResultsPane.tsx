import React, { useEffect, useState } from 'react';
import { useParserStore, normalizeLink } from '../store/useParserStore';
import { fetchLinkMetadata, getDomain, getCachedLinkMetadata, subscribeLinkMetadata } from '../lib/linkMetadata';

export const ResultsPane: React.FC = () => {
  const items = useParserStore(state => state.items);
  const toggleItemChecked = useParserStore(state => state.toggleItemChecked);
  const triggerCopiedFeedback = useParserStore(state => state.triggerCopiedFeedback);
  const linkColors = useParserStore(state => state.linkColors);

  const [, setMetaTick] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetState, setDragTargetState] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);


  useEffect(() => {
    return subscribeLinkMetadata(() => {
      setMetaTick(t => t + 1);
    });
  }, []);

  useEffect(() => {
    items.forEach(item => {
      if (item.link && item.link !== '#') {
        fetchLinkMetadata(item.link);
      }
    });
  }, [items]);

  const handleCopy = (text: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    navigator.clipboard.writeText(text).then(() => {
      triggerCopiedFeedback();
      const textSpan = btn.querySelector('span');
      if (textSpan) {
        textSpan.classList.add('text-green-500');
        setTimeout(() => textSpan.classList.remove('text-green-500'), 200);
      }
    });
  };

  const syncScroll = (syncId: number, text: string) => {
    navigator.clipboard.writeText(text);

    const rawViewer = document.getElementById('raw-viewer');
    if (rawViewer) {
      const target = rawViewer.querySelector(`[data-line-id='${syncId}']`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelectorAll('.active-sync').forEach(el => el.classList.remove('active-sync'));
        target.classList.add('active-sync');
        setTimeout(() => target.classList.remove('active-sync'), 2000);
      }
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col font-sans select-none">
      <div className="absolute top-0 left-0 w-full z-50 h-8 border-b border-[var(--surface-border)] flex items-center px-8 backdrop-blur-xl bg-[var(--surface-bg)]/40 shadow-sm pointer-events-auto rounded-t-2xl">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)] opacity-50 select-none">A-Roll Timeline</span>
      </div>
      <div 
        id="results" 
        className="flex-1 overflow-y-auto @container relative scroll-mask-top"
      >
        <div className="p-4 pt-10 space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] mt-10">No clips found.</div>
        ) : (
          items.map((item, index) => {
            const opacityClass = item.included ? '' : 'excluded';
            const durClass = item.duration === 0 ? 'text-red-500' : 'text-cyan-500';
            const normalized = normalizeLink(item.link);
            const linkColor = linkColors[normalized] || 'var(--color-pill-bg)';
            const linkMeta = getCachedLinkMetadata(item.link);
            const domain = getDomain(item.link);

            return (
              <div 
                key={item.id} 
                id={`card-${item.id}`} 
                className={`surface rounded-xl px-2 py-2.5 @min-[480px]:px-4 @min-[480px]:py-3 flex flex-col @min-[480px]:flex-row items-center gap-1.5 @min-[480px]:gap-4 transition-all duration-300 hover:scale-[1.01] hover:bg-slate-100 dark:hover:bg-[var(--pill-bg)] border-l-4 ${item.checked ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] item-done' : 'border-[var(--surface-border)]'} hover:border-[var(--accent)] ${opacityClass}`}
              >
                {/* Header Zone: Index, Pill, Inline Link Preview Chip, and Mobile Link */}
                <div className="flex items-center justify-between w-full @min-[480px]:w-auto @min-[480px]:flex-1 gap-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 @min-[480px]:gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-2 -m-2 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent text selection
                          setIsDragging(true);
                          setDragTargetState(!item.checked);
                          toggleItemChecked(index, !item.checked);
                        }}
                        onMouseEnter={() => {
                          if (isDragging) {
                            toggleItemChecked(index, dragTargetState);
                          }
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={item.checked} 
                          className="custom-checkbox h-5 w-5 pointer-events-none" 
                          readOnly
                        />
                      </div>
                      <span className="text-[var(--text-muted)] font-mono text-xs w-5 font-medium">{index + 1}.</span>
                    </div>
                    <button 
                      onClick={() => syncScroll(item.syncId, item.meta)} 
                      className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border border-[var(--surface-border)] transition-all cursor-pointer group/meta active:scale-95 shadow-sm text-[#0b0f1a] shrink-0" 
                      style={{ backgroundColor: linkColor }}
                    >
                      <span className="transition-colors uppercase">{item.meta}</span>
                    </button>
                  </div>

                  {/* Inline Link Preview Chip (Fills empty margin space in wide pane view, hides when pane contracts) */}
                  {item.link && item.link !== '#' && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="hidden @min-[600px]:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--background)]/80 border border-[var(--surface-border)] hover:border-[var(--accent)] transition-all min-w-0 max-w-[320px] flex-1 truncate group/link shrink shadow-xs"
                      title={`Open ${linkMeta?.title || item.link}`}
                    >
                      {linkMeta?.thumbnail ? (
                        <img 
                          src={linkMeta.thumbnail} 
                          alt="Thumbnail" 
                          className="w-7 h-5 object-cover rounded-md border border-[var(--surface-border)] shrink-0 group-hover/link:scale-105 transition-transform" 
                        />
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/20 shrink-0">
                          {domain}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[var(--foreground)] truncate group-hover/link:text-[var(--accent)] transition-colors">
                        {linkMeta?.title || domain}
                      </span>
                    </a>
                  )}
                  
                  {/* Slim Mode Link: Visible below 480px */}
                  <div className="flex @min-[480px]:hidden shrink-0">
                    {item.link !== '#' ? (
                      <a href={item.link} className="p-2 rounded-xl bg-[var(--btn-bg)] hover:bg-[var(--accent)] text-[var(--foreground)] hover:text-white transition-all flex items-center justify-center active:scale-95 border border-[var(--surface-border)] shadow-sm" target="_blank" rel="noreferrer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <div className="w-[42px]"></div>
                    )}
                  </div>
                </div>

                {/* Center Zone: Timestamps */}
                <div className="flex justify-center w-full @min-[480px]:w-auto mt-0.5 @min-[480px]:mt-0">
                  {item.isSingle ? (
                    <div className="flex w-full @min-[480px]:w-auto justify-center items-center gap-1 px-2 py-1.5 rounded-xl border border-[var(--timestamp-border)] bg-[var(--color-btn-bg)] shadow-sm">
                      <button onClick={(e) => handleCopy(item.start, e)} className="flex-1 @min-[480px]:flex-none relative hover:bg-[var(--accent)] hover:text-white px-2 py-1 rounded-lg transition-colors group/btn active:scale-95">
                        <span className="font-mono text-[13px] font-bold text-[var(--foreground)] group-hover/btn:text-white transition-colors">{item.start}</span>
                      </button>
                      <div className="px-2" data-tooltip="Single timestamp (Still). Not counted in A-Roll.">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex w-full @min-[480px]:w-auto justify-between @min-[480px]:justify-center items-center gap-1 px-1 @min-[480px]:px-2 py-1 rounded-xl border border-[var(--timestamp-border)] bg-[var(--color-btn-bg)] shadow-sm">
                      <button onClick={(e) => handleCopy(item.start, e)} className="flex-1 @min-[480px]:flex-none relative hover:bg-[var(--accent)] hover:text-white px-1 @min-[480px]:px-2 py-1 rounded-lg transition-colors group/btn active:scale-95 text-center">
                        <span className="font-mono text-[13px] font-bold text-[var(--foreground)] group-hover/btn:text-white transition-colors">{item.start}</span>
                      </button>
                      
                      <div className="flex flex-col items-center px-0.5 @min-[480px]:px-2 relative min-w-[36px]">
                        <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-0.5 pointer-events-none">Dur</span>
                        <span className={`text-[12px] font-mono ${durClass} font-bold pointer-events-none`}>{item.duration}s</span>
                        {item.duration === 0 && (
                          <span className="absolute -top-3 -right-2 text-[10px] text-red-500 animate-pulse" title="Invalid Duration">⚠️</span>
                        )}
                      </div>

                      <button onClick={(e) => handleCopy(item.end || '', e)} className="flex-1 @min-[480px]:flex-nowrap relative hover:bg-[var(--accent)] hover:text-white px-1 @min-[480px]:px-2 py-1 rounded-lg transition-colors group/btn active:scale-95 text-center">
                        <span className="font-mono text-[13px] font-bold text-[var(--foreground)] group-hover/btn:text-white transition-colors">{item.end}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Zone: Horizontal Mode Link (Visible above 480px) */}
                <div className="hidden @min-[480px]:flex items-center justify-end shrink-0 min-w-[60px] ml-auto">
                  {item.link !== '#' ? (
                    <a href={item.link} className="p-2.5 rounded-xl bg-[var(--btn-bg)] hover:bg-[var(--accent)] text-[var(--foreground)] hover:text-white transition-all border border-[var(--surface-border)] hover:border-transparent flex items-center justify-center active:scale-95 shadow-sm" target="_blank" rel="noreferrer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <div className="w-[42px]"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};
