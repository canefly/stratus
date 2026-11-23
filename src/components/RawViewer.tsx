import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useParserStore, normalizeLink } from '../store/useParserStore';
import { ContextMenu } from './ContextMenu';
import { fetchLinkMetadata, getDomain, getCachedLinkMetadata, subscribeLinkMetadata } from '../lib/linkMetadata';
import type { ParsedItem } from '../lib/parser';
import { invoke } from '@tauri-apps/api/core';

const renderSpanText = (text: string) => {
  let styledHtml = text.replace(/(@?editor\s*[:;]?)/gi, '<span class="highlight-trigger">$1</span>');
  const timePattern = /(?:\(?(?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?\)?(?:\s*(?:[-–—]|to)\s*\(?(?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?\)?)|(?:\(?(?:\d{1,2}:)?\d{1,2}:\d{2}(?::\d{2})?\)?))/gi;
  styledHtml = styledHtml.replace(timePattern, (match) => {
      // Prevent matching empty strings
      if (!match.trim()) return match;
      return `<span class="highlight-time" title="Click to sync • Hover to preview link">${match}</span>`;
  });
  return styledHtml;
};

export const DocxImage = ({ img }: { img: string }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    invoke<number[]>('read_file_bytes', { path: img }).then((bytes) => {
      if (!active) return;
      const extMatch = img.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      const filename = img.split(/[\/\\]/).pop() || `image.${ext}`;
      const blob = new Blob([new Uint8Array(bytes)], { type: mime });
      const file = new File([blob], filename, { type: mime });
      setBlobUrl(URL.createObjectURL(blob));
      setFileObj(file);
    }).catch(e => console.error("Failed to load image bytes", e));
    return () => { active = false; };
  }, [img]);

  if (!blobUrl) {
    return <div className="my-3 animate-pulse bg-white/5 h-32 w-48 rounded-lg border border-[var(--surface-border)]"></div>;
  }

  return (
    <div className="my-3 inline-block">
      <img 
        src={blobUrl} 
        alt="Extracted from docx" 
        className="max-w-full max-h-[300px] object-contain rounded-lg border border-[var(--surface-border)] shadow-md cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[var(--accent)] transition-all"
        draggable={true}
        onDragStart={(e) => {
          if (fileObj) {
            e.dataTransfer.items.add(fileObj);
          }
          const extMatch = img.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1] : 'png';
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
          const filename = img.split(/[\/\\]/).pop() || `image.${ext}`;
          
          const fileUri = `file:///${img.replace(/\\/g, '/')}`;
          e.dataTransfer.setData("text/uri-list", fileUri);
          e.dataTransfer.setData("text/plain", fileUri);
          e.dataTransfer.setData("DownloadURL", `${mime}:${filename}:${fileUri}`);
        }}
        title="Drag me to your timeline!"
      />
    </div>
  );
};

export const RawViewer: React.FC = () => {
  const content = useParserStore(state => state.content);
  const customNotes = useParserStore(state => state.customNotes);
  const setNotesModalOpen = useParserStore(state => state.setNotesModalOpen);
  const linkColors = useParserStore(state => state.linkColors);
  const triggerCopiedFeedback = useParserStore(state => state.triggerCopiedFeedback);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    blockId: number;
    selectedText: string;
  } | null>(null);
  const [fontSize, setFontSize] = useState(15);
  const [hoveredTimestamp, setHoveredTimestamp] = useState<{
    rect: { top: number; left: number; right: number; bottom: number; width: number; height: number };
    item: ParsedItem;
    timeText: string;
  } | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHideCard = useCallback(() => {
    cancelHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsCardVisible(false);
      setTimeout(() => {
        setHoveredTimestamp(null);
      }, 200); // match 200ms fade transition
    }, 200); // 200ms delay before disappearing
  }, [cancelHideTimer]);

  const [, setMetaTick] = useState(0);

  useEffect(() => {
    return () => {
      cancelHideTimer();
    };
  }, [cancelHideTimer]);

  useEffect(() => {
    return subscribeLinkMetadata(() => {
      setMetaTick(t => t + 1);
    });
  }, []);

  const blocks = useMemo(() => {
    if (!content) return [];
    try {
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }, [content]);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const parentBlock = (e.target as HTMLElement).closest('[data-line-id]');
    if (parentBlock) {
      e.preventDefault();
      const blockId = parseInt(parentBlock.getAttribute('data-line-id') || '-1', 10);
      let selectedText = window.getSelection()?.toString().trim();
      
      if (!selectedText) {
         const targetBlock = blocks.find((b: any) => b.id === blockId);
         selectedText = targetBlock ? targetBlock.text : '';
      }
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        blockId,
        selectedText: selectedText || ''
      });
    }
  };

  const handleBadgeClick = useCallback((noteId: string) => {
    setNotesModalOpen(true);
    setTimeout(() => {
      const modal = document.querySelector('.animate-modal-pop');
      if (modal) {
        const target = document.getElementById(`custom-note-${noteId}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('border-emerald-500');
          setTimeout(() => target.classList.remove('border-emerald-500'), 2000);
        }
      }
    }, 150);
  }, [setNotesModalOpen]);

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.highlight-time') as HTMLElement;
    if (target) {
      const parentBlock = target.closest('[data-line-id]');
      if (!parentBlock) return;

      const lineId = parseInt(parentBlock.getAttribute('data-line-id') || '-1', 10);
      const siblings = Array.from(parentBlock.querySelectorAll('.highlight-time'));
      const timeIndex = siblings.indexOf(target);

      const currentItems = useParserStore.getState().items;
      const matchingItems = currentItems.filter(item => item.syncId === lineId);
      if (matchingItems.length > 0 && matchingItems[timeIndex]) {
        const targetItem = matchingItems[timeIndex];
        if (targetItem.link) {
          fetchLinkMetadata(targetItem.link);
        }
        const rect = target.getBoundingClientRect();
        cancelHideTimer();

        const timeText = target.textContent || '';
        const isDifferentItem = !hoveredTimestamp || hoveredTimestamp.item.id !== targetItem.id || hoveredTimestamp.timeText !== timeText;

        if (isDifferentItem) {
          setIsCardVisible(false);
          setHoveredTimestamp({
            rect: {
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            },
            item: targetItem,
            timeText
          });
          requestAnimationFrame(() => {
            setIsCardVisible(true);
          });
        } else {
          setIsCardVisible(true);
        }
      }
    }
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as HTMLElement;
    if (!related || (!related.closest('.highlight-time') && !related.closest('.timestamp-preview-card'))) {
      scheduleHideCard();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('highlight-time')) {
      e.stopPropagation();
      e.preventDefault();
      
      const parentBlock = target.closest('[data-line-id]');
      if (!parentBlock) return;
      
      const lineId = parseInt(parentBlock.getAttribute('data-line-id') || '-1', 10);
      const siblings = Array.from(parentBlock.querySelectorAll('.highlight-time'));
      const timeIndex = siblings.indexOf(target);
      
      const currentItems = useParserStore.getState().items;
      const matchingItems = currentItems.filter(item => item.syncId === lineId);
      if (matchingItems.length > 0 && matchingItems[timeIndex]) {
        const targetItem = matchingItems[timeIndex];

        const wasHidden = useParserStore.getState().isTimelineHidden;
        if (wasHidden) {
          useParserStore.getState().setIsTimelineHidden(false);
        }

        const scrollTarget = () => {
          const card = document.getElementById(`card-${targetItem.id}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.querySelectorAll('.card-flash').forEach(c => c.classList.remove('card-flash'));
            card.classList.add('card-flash');
            setTimeout(() => card.classList.remove('card-flash'), 1500);
          }
        };

        if (wasHidden) {
          setTimeout(scrollTarget, 100);
        } else {
          scrollTarget();
        }
      }
    }
  };

  const renderedBlocks = useMemo(() => {
    return blocks.map((block: any) => {
      let Tag: any = 'div';
      let customClass = "mb-4 text-[var(--foreground)] leading-relaxed relative rounded-r-lg px-2 py-1 ";
      
      const blockNotes = customNotes.filter(n => n.blockId === block.id);
      const hasComment = blockNotes.some(n => n.comment);
      const hasNote = blockNotes.length > 0;
      
      if (hasComment) {
         customClass += " bg-purple-500/10 border-l-2 border-purple-500 ";
      } else if (hasNote) {
         customClass += " bg-amber-500/10 border-l-2 border-amber-500 ";
      }

      if (block.isHeader) {
         if (block.headerLevel === 1) { Tag = 'h1'; customClass += "text-[2.25em] font-bold mb-4 mt-6"; }
         else if (block.headerLevel === 2) { Tag = 'h2'; customClass += "text-[1.5em] font-bold mb-3 mt-5"; }
         else if (block.headerLevel === 3) { Tag = 'h3'; customClass += "text-[1.25em] font-bold mb-3 mt-4"; }
         else { Tag = 'h4'; customClass += "text-[1.125em] font-bold mb-2 mt-4"; }
      }
      
      return (
        <Tag key={block.id} id={`block-${block.id}`} data-line-id={block.id} className={customClass}>
          {hasComment && (
            <div 
              className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform group/badge z-10"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                const commentNote = blockNotes.find(n => n.comment);
                if (commentNote) handleBadgeClick(commentNote.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div className="absolute hidden group-hover/badge:block right-0 top-8 w-48 p-2 bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg shadow-xl text-xs z-[60] cursor-default" onClick={e => e.stopPropagation()}>
                <p className="line-clamp-3 overflow-hidden text-ellipsis text-left text-[var(--foreground)] break-words">
                  {blockNotes.find(n => n.comment)?.comment}
                </p>
              </div>
            </div>
          )}
          {block.spans.map((span: any, idx: number) => {
             const styleObj: any = { color: span.color || 'inherit' };
             if (span.bold) styleObj.fontWeight = 'bold';
             if (span.italic) styleObj.fontStyle = 'italic';
             if (span.size) {
               const ptMatch = span.size.match(/([\d.]+)pt/);
               if (ptMatch && ptMatch[1]) {
                 styleObj.fontSize = `calc(${parseFloat(ptMatch[1]) / 11}em)`;
               } else {
                 styleObj.fontSize = span.size;
               }
             }
             
             const content = (
               <span 
                 key={idx} 
                 style={styleObj} 
                 dangerouslySetInnerHTML={{ __html: renderSpanText(span.text) }} 
               />
             );

             if (span.link) {
               const normalized = normalizeLink(span.link);
               const linkColor = linkColors[normalized] || 'rgb(96 165 250)'; // fallback to blue-400
               
               return (
                 <a 
                   key={idx} 
                   href={span.link} 
                   target="_blank" 
                   rel="noreferrer" 
                   className="underline transition-colors cursor-pointer hover:opacity-80"
                   style={{ ...styleObj, color: linkColor }} 
                   dangerouslySetInnerHTML={{ __html: renderSpanText(span.text) }} 
                 />
               );
             }
             
             return content;
          })}
          {block.images && block.images.length > 0 && (
            <div className="flex flex-wrap gap-2 my-2">
              {block.images.map((img: string, idx: number) => (
                <DocxImage key={`img-${idx}`} img={img} />
              ))}
            </div>
          )}
        </Tag>
      );
    });
  }, [blocks, customNotes, linkColors, handleBadgeClick]);

  return (
    <div className="w-full h-full relative flex flex-col font-sans">
      <div className="absolute top-0 left-0 w-full z-50 h-8 border-b border-[var(--surface-border)] flex items-center justify-between px-8 backdrop-blur-xl bg-[var(--surface-bg)]/40 shadow-sm pointer-events-auto rounded-t-2xl">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)] opacity-50 select-none">Raw Source Script</span>
        <div className="flex items-center gap-3" title="Adjust Font Size">
          <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60 select-none">Aa</span>
          <input 
            type="range" 
            value={fontSize}
            min="12" 
            max="28" 
            step="1" 
            onChange={(e) => setFontSize(parseInt(e.target.value))} 
            className="w-16 opacity-70 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      <div 
        id="raw-viewer" 
        className="flex-1 overflow-y-auto select-text font-sans relative @container scroll-mask-top"
        style={{ fontSize: `${fontSize}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        <div className="p-8 pt-10 space-y-4">
          {renderedBlocks}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          blockId={contextMenu.blockId} 
          selectedText={contextMenu.selectedText} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Timestamp Hover Link Preview Card */}
      {hoveredTimestamp && (() => {
        const link = hoveredTimestamp.item.link;
        const meta = getCachedLinkMetadata(link);
        const domain = getDomain(link);

        const fitsRight = hoveredTimestamp.rect.right + 300 < window.innerWidth;
        const left = fitsRight 
          ? hoveredTimestamp.rect.right + 12 
          : Math.max(16, hoveredTimestamp.rect.left - 12);

        const centerY = hoveredTimestamp.rect.top + (hoveredTimestamp.rect.height / 2);
        const top = Math.min(window.innerHeight - 150, Math.max(80, centerY));
        const transformClass = fitsRight ? '-translate-y-1/2' : '-translate-x-full -translate-y-1/2';
        const originClass = fitsRight ? 'origin-left' : 'origin-right';
        const visibilityClass = isCardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none';

        return (
          <div 
            key={`${hoveredTimestamp.item.id}-${hoveredTimestamp.timeText}`}
            onMouseEnter={cancelHideTimer}
            onMouseLeave={scheduleHideCard}
            className={`timestamp-preview-card fixed z-[100] w-72 surface border border-[var(--surface-border)] rounded-2xl shadow-2xl p-3 backdrop-blur-xl bg-[var(--surface-bg)]/95 text-left pointer-events-auto transition-[opacity,transform] duration-200 ease-out ${originClass} ${transformClass} ${visibilityClass}`}
            style={{ left: `${left}px`, top: `${top}px` }}
          >
            {meta?.loading ? (
              <div className="py-2 flex items-center justify-center gap-2 text-xs font-bold text-[var(--accent)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping shrink-0"></span>
                <span>Fetching link preview...</span>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {meta?.thumbnail && (
                  <img 
                    src={meta.thumbnail} 
                    alt="Preview" 
                    className="w-16 h-12 object-cover rounded-lg border border-[var(--surface-border)] shrink-0 shadow-sm"
                  />
                )}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.2 rounded border border-[var(--accent)]/20 shrink-0">
                      {domain}
                    </span>
                    {meta?.author && (
                      <span className="text-[10px] font-bold text-[var(--text-muted)] truncate">
                        {meta.author}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-[var(--foreground)] leading-snug line-clamp-2" title={meta?.title || domain}>
                    {meta?.title || domain}
                  </h4>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2 mt-0.5">
                    {meta?.description || 'No description available.'}
                  </p>
                </div>
              </div>
            )}

            {link && link !== '#' && (
              <div className="mt-2 pt-2 border-t border-[var(--surface-border)]/40 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="truncate max-w-[180px] hover:text-[var(--accent)] hover:underline transition-colors flex items-center gap-1" 
                  title={link}
                >
                  <span className="truncate">{link}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    triggerCopiedFeedback();
                  }}
                  className="text-[var(--accent)] font-bold hover:underline shrink-0 px-1.5 py-0.5 rounded hover:bg-[var(--accent)]/10 transition-colors"
                  title="Copy link to clipboard"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};



