import React, { useEffect } from 'react';
import { useParserStore } from '../store/useParserStore';
import { ask, open } from '@tauri-apps/plugin-dialog';
import { fetchLinkMetadata, subscribeLinkMetadata, getCachedLinkMetadata } from '../lib/linkMetadata';
import { logger } from '../lib/logger';
import type { LogEntry } from '../lib/logger';

const formatHumanTime = (seconds: number) => {
  if (seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
  return parts.join(' ');
};

const DeveloperLogsConsole: React.FC = () => {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [copied, setCopied] = React.useState(false);
  const [filterLevel, setFilterLevel] = React.useState<string>('all');

  useEffect(() => {
    return logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
  }, []);

  const handleCopy = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.tag}] ${l.message} ${l.details !== undefined ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(l => filterLevel === 'all' || l.level === filterLevel);

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'info', 'drag', 'warn', 'error', 'debug'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                filterLevel === lvl 
                  ? 'bg-[var(--accent)] text-[#0b0f1a]' 
                  : 'bg-[var(--surface-bg)] text-[var(--text-muted)] hover:text-[var(--foreground)] border border-[var(--surface-border)]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-[var(--surface-bg)] border border-[var(--surface-border)] hover:border-[var(--accent)] text-[10px] font-bold text-[var(--foreground)] transition-all flex items-center gap-1"
          >
            {copied ? '✓ Copied' : '📋 Copy Logs'}
          </button>
          <button
            onClick={() => logger.clear()}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 text-rose-400 text-[10px] font-bold transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="h-64 bg-black/90 border border-[var(--surface-border)] rounded-xl p-3 overflow-y-auto space-y-1.5 text-[11px] leading-relaxed custom-scrollbar selection:bg-[var(--accent)] selection:text-black">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] italic text-xs">
            No events logged yet. Drag a video or interact with the app to stream logs.
          </div>
        ) : (
          filteredLogs.map((log) => {
            let badgeBg = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
            if (log.level === 'drag') badgeBg = 'text-purple-400 bg-purple-400/10 border-purple-400/30';
            if (log.level === 'warn') badgeBg = 'text-amber-400 bg-amber-400/10 border-amber-400/30';
            if (log.level === 'error') badgeBg = 'text-red-400 bg-red-400/10 border-red-400/30';
            if (log.level === 'debug') badgeBg = 'text-slate-400 bg-slate-400/10 border-slate-400/30';

            return (
              <div key={log.id} className="flex flex-col gap-0.5 border-b border-white/5 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border shrink-0 ${badgeBg}`}>
                    {log.level}
                  </span>
                  <span className="text-[var(--accent)] font-bold shrink-0">[{log.tag}]</span>
                  <span className="text-slate-200 font-sans text-[11px] break-all">{log.message}</span>
                </div>
                {log.details !== undefined && (
                  <pre className="text-[10px] text-emerald-400/90 bg-black/50 p-1.5 rounded border border-white/5 overflow-x-auto whitespace-pre-wrap font-mono ml-6">
                    {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const Modals: React.FC = () => {
  const { 
    isNotesModalOpen, setNotesModalOpen, notes, customNotes, removeCustomNote,
    checkedNotes, toggleNoteChecked, toggleAllNotesChecked,
    isLinkModalOpen, setLinkModalOpen, links, checkedLinks, toggleLinkChecked, toggleAllLinksChecked,
    isStatusModalOpen, setStatusModalOpen, importReport,
    isSettingsModalOpen, setSettingsModalOpen, darkVariant, setDarkVariant,
    themeMode, setThemeMode, isWidescreen, toggleWidescreen,
    factoryReset, resetStats, setDataVaultOpen,
    performanceMode, setPerformanceMode,
    showBadges, setShowBadges,
    auroraSize, setAuroraSize, auroraOpacity, setAuroraOpacity,
    stats, sessionSeconds,
    imageExtractionPath, setImageExtractionPath
  } = useParserStore();

  const [openSections, setOpenSections] = React.useState<Set<string>>(new Set(['theme', 'general', 'about']));
  const [visitedLinks, setVisitedLinks] = React.useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = React.useState('');
  const [linkFilter, setLinkFilter] = React.useState<'all' | 'pending' | 'checked'>('all');
  const [noteSearchQuery, setNoteSearchQuery] = React.useState('');
  const [noteFilter, setNoteFilter] = React.useState<'all' | 'pending' | 'checked'>('all');

  const [expandedLinks, setExpandedLinks] = React.useState<Set<string>>(new Set());
  const [, setMetaTick] = React.useState(0);

  useEffect(() => {
    return subscribeLinkMetadata(() => {
      setMetaTick(t => t + 1);
    });
  }, []);

  const toggleExpandLink = (link: string) => {
    setExpandedLinks(prev => {
      const next = new Set(prev);
      if (next.has(link)) {
        next.delete(link);
      } else {
        next.add(link);
        fetchLinkMetadata(link);
      }
      return next;
    });
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLinkVisit = (link: string) => {
    setVisitedLinks(prev => new Set(prev).add(link));
    if (!checkedLinks[link]) {
      toggleLinkChecked(link);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 1500);
    });
  };

  const jumpToNote = (lineIndex: number) => {
    setNotesModalOpen(false);
    setTimeout(() => {
      const rawViewer = document.getElementById('raw-viewer');
      if (rawViewer) {
        const target = rawViewer.querySelector(`[data-line-id='${lineIndex}']`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.querySelectorAll('.active-sync').forEach(el => el.classList.remove('active-sync'));
          target.classList.add('active-sync');
          setTimeout(() => target.classList.remove('active-sync'), 2000);
        }
      }
    }, 150);
  };

  const jumpToCustomNote = (blockId: number) => {
    setNotesModalOpen(false);
    setTimeout(() => {
      const target = document.getElementById(`block-${blockId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('border-emerald-500');
        setTimeout(() => target.classList.remove('border-emerald-500'), 2000);
      }
    }, 150);
  };

  return (
    <>
      {(() => {
        const allNotesList = [
          ...notes.map((n, i) => ({ id: `n_${n.id}`, type: 'standard' as const, note: n, index: i + 1 })),
          ...customNotes.map((c, i) => ({ id: `c_${c.id}`, type: 'custom' as const, customNote: c, index: notes.length + i + 1 }))
        ];

        const totalNotesCount = allNotesList.length;
        const checkedNotesCount = allNotesList.filter(item => checkedNotes[item.id]).length;
        const pendingNotesCount = totalNotesCount - checkedNotesCount;
        const notesProgressPercent = totalNotesCount > 0 ? Math.round((checkedNotesCount / totalNotesCount) * 100) : 0;
        const allNotesChecked = totalNotesCount > 0 && checkedNotesCount === totalNotesCount;

        const filteredNotesList = allNotesList.filter((item) => {
          const isChecked = !!checkedNotes[item.id];
          const query = noteSearchQuery.toLowerCase();
          const textContent = item.type === 'standard' 
            ? item.note.text 
            : (item.customNote.selectedText + ' ' + (item.customNote.comment || ''));
          const matchesQuery = !query || textContent.toLowerCase().includes(query);

          if (!matchesQuery) return false;
          if (noteFilter === 'checked') return isChecked;
          if (noteFilter === 'pending') return !isChecked;
          return true;
        });

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${isNotesModalOpen ? '' : 'hidden'}`}>
            <div className="absolute inset-0 modal-overlay" onClick={() => setNotesModalOpen(false)}></div>
            <div className={`relative surface border-[var(--surface-border)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden ${isNotesModalOpen ? 'animate-modal-pop' : ''}`}>
              
              {/* Header */}
              <div className="py-3 px-5 border-b border-[var(--surface-border)] flex justify-between items-center bg-[var(--surface-bg)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--foreground)] tracking-wide">Editor Notes</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        {totalNotesCount} {totalNotesCount === 1 ? 'Note' : 'Notes'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">Checklist and directory of document notes and annotations.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setNotesModalOpen(false)} 
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-1.5 rounded-lg hover:bg-[var(--background)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress & Controls Header */}
              {totalNotesCount > 0 && (
                <div className="px-5 py-3 border-b border-[var(--surface-border)] bg-[var(--background)] space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Checklist Progress: {checkedNotesCount} of {totalNotesCount} completed
                      </span>
                      <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {notesProgressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-border)]/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${notesProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Toolbar controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* Search filter */}
                    <div className="relative flex-1 min-w-[180px]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input 
                        type="text" 
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                        placeholder="Search notes..." 
                        className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-[var(--surface-bg)] border border-[var(--surface-border)] focus:border-amber-500 text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all outline-none"
                      />
                      {noteSearchQuery && (
                        <button 
                          onClick={() => setNoteSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="flex items-center p-0.5 rounded-lg bg-[var(--surface-bg)] border border-[var(--surface-border)]">
                      {(['all', 'pending', 'checked'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setNoteFilter(tab)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                            noteFilter === tab
                              ? 'bg-amber-500 text-black shadow-xs'
                              : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          {tab === 'all' && `All (${totalNotesCount})`}
                          {tab === 'pending' && `Pending (${pendingNotesCount})`}
                          {tab === 'checked' && `Checked (${checkedNotesCount})`}
                        </button>
                      ))}
                    </div>

                    {/* Toggle All Button */}
                    <button
                      onClick={() => toggleAllNotesChecked(!allNotesChecked)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-[var(--surface-border)] hover:border-amber-500 bg-[var(--surface-bg)] text-[var(--foreground)] hover:text-amber-500 transition-all flex items-center gap-1.5"
                    >
                      <span>{allNotesChecked ? 'Uncheck All' : 'Check All'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Notes Checklist Content List */}
              <div className="p-4 overflow-y-auto space-y-2.5 bg-[var(--background)] flex-1">
                {totalNotesCount === 0 ? (
                  <div className="py-12 text-center text-[var(--text-muted)] text-sm italic">
                    No notes found in this document.
                  </div>
                ) : filteredNotesList.length === 0 ? (
                  <div className="py-12 text-center text-[var(--text-muted)] text-sm italic">
                    No notes match the current filter or search query.
                  </div>
                ) : (
                  filteredNotesList.map((item) => {
                    const isChecked = !!checkedNotes[item.id];

                    if (item.type === 'standard') {
                      return (
                        <div 
                          key={item.id} 
                          className={`group bg-[var(--surface-bg)] p-3.5 rounded-xl border transition-all duration-200 hover:border-amber-500 flex items-start gap-3 ${
                            isChecked ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.08)] item-done' : 'border-[var(--surface-border)]'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleNoteChecked(item.id)}
                            className="custom-checkbox h-5 w-5 mt-0.5 shrink-0 cursor-pointer"
                          />

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono">
                                Note #{item.index}
                              </span>
                              <button
                                onClick={() => jumpToNote(item.note.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--background)] hover:bg-amber-500 hover:text-black border border-[var(--surface-border)] text-[var(--text-muted)] transition-all flex items-center gap-1 shrink-0"
                                title="Jump to Note in Script"
                              >
                                <span>Jump</span>
                                <span>→</span>
                              </button>
                            </div>
                            <p 
                              className={`text-xs text-[var(--foreground)] font-mono leading-relaxed transition-opacity ${isChecked ? 'line-through opacity-60' : ''}`}
                              dangerouslySetInnerHTML={{ __html: item.note.text.replace(/(@editor\s*[:;]?)/gi, '<span class="text-amber-500 font-bold">$1</span>') }}
                            ></p>
                          </div>
                        </div>
                      );
                    } else {
                      const cNote = item.customNote;
                      return (
                        <div 
                          key={item.id} 
                          id={`custom-note-${cNote.id}`}
                          className={`group bg-[var(--surface-bg)] p-3.5 rounded-xl border transition-all duration-200 hover:border-purple-500 flex items-start gap-3 ${
                            isChecked ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.08)] item-done' : 'border-[var(--surface-border)]'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleNoteChecked(item.id)}
                            className="custom-checkbox h-5 w-5 mt-0.5 shrink-0 cursor-pointer"
                          />

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">
                                Selection Note #{item.index}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => jumpToCustomNote(cNote.blockId)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--background)] hover:bg-purple-500 hover:text-white border border-[var(--surface-border)] text-[var(--text-muted)] transition-all flex items-center gap-1 shrink-0"
                                  title="Jump to Selection in Script"
                                >
                                  <span>Jump</span>
                                  <span>→</span>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removeCustomNote(cNote.id); }}
                                  className="text-[var(--text-muted)] hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete Note"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <p className={`text-xs text-[var(--text-muted)] font-mono italic pl-2 border-l-2 border-purple-500/30 line-clamp-2 ${isChecked ? 'line-through opacity-60' : ''}`}>
                              "{cNote.selectedText}"
                            </p>
                            
                            {cNote.comment && (
                              <div className="bg-[var(--background)] p-2.5 rounded-lg border border-[var(--surface-border)]">
                                <span className="text-[9px] font-bold text-[var(--foreground)] uppercase tracking-wider mb-0.5 block">Comment</span>
                                <p className={`text-xs text-[var(--foreground)] ${isChecked ? 'line-through opacity-60' : ''}`}>{cNote.comment}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-[var(--surface-border)] bg-[var(--surface-bg)] rounded-b-2xl flex items-center justify-between text-xs text-[var(--text-muted)] px-5">
                <span>Click checkbox to check off completed notes.</span>
                <span className="font-mono font-bold text-[10px] text-emerald-400">
                  {checkedNotesCount} / {totalNotesCount} Done
                </span>
              </div>
            </div>
          </div>
        );
      })()}
      {(() => {
        const totalCount = links.length;
        const checkedCount = links.filter(l => checkedLinks[l]).length;
        const pendingCount = totalCount - checkedCount;
        const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        const allChecked = totalCount > 0 && checkedCount === totalCount;

        const getDomain = (url: string) => {
          try {
            const raw = url.startsWith('http') ? url : `https://${url}`;
            const parsed = new URL(raw);
            return parsed.hostname.replace(/^www\./, '');
          } catch {
            return 'link';
          }
        };

        const filteredLinks = links
          .map((link, originalIndex) => ({ link, originalIndex }))
          .filter(({ link }) => {
            const matchesQuery = !linkSearchQuery || link.toLowerCase().includes(linkSearchQuery.toLowerCase());
            const isChecked = !!checkedLinks[link];
            if (!matchesQuery) return false;
            if (linkFilter === 'checked') return isChecked;
            if (linkFilter === 'pending') return !isChecked;
            return true;
          });

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${isLinkModalOpen ? '' : 'hidden'}`}>
            <div className="absolute inset-0 modal-overlay" onClick={() => setLinkModalOpen(false)}></div>
            <div className={`relative surface border-[var(--surface-border)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden ${isLinkModalOpen ? 'animate-modal-pop' : ''}`}>
              
              {/* Header */}
              <div className="py-3 px-5 border-b border-[var(--surface-border)] flex justify-between items-center bg-[var(--surface-bg)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--foreground)] tracking-wide">Source Links</h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                        {totalCount} {totalCount === 1 ? 'Link' : 'Links'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">Checklist and directory of document source references.</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setLinkModalOpen(false)} 
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-1.5 rounded-lg hover:bg-[var(--background)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress & Controls Header */}
              {totalCount > 0 && (
                <div className="px-5 py-3 border-b border-[var(--surface-border)] bg-[var(--background)] space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Checklist Progress: {checkedCount} of {totalCount} completed
                      </span>
                      <span className="font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-border)]/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Toolbar controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* Search filter */}
                    <div className="relative flex-1 min-w-[180px]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input 
                        type="text"
                        placeholder="Search links..."
                        value={linkSearchQuery}
                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1 text-xs surface rounded-lg text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                      />
                      {linkSearchQuery && (
                        <button 
                          onClick={() => setLinkSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter tabs */}
                    <div className="flex bg-[var(--surface-bg)] p-1 rounded-lg border border-[var(--surface-border)] text-[10px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setLinkFilter('all')}
                        className={`px-2.5 py-0.5 rounded-md transition-colors ${linkFilter === 'all' ? 'bg-[var(--accent)] text-[#0b0f1a]' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                      >
                        All ({totalCount})
                      </button>
                      <button
                        onClick={() => setLinkFilter('pending')}
                        className={`px-2.5 py-0.5 rounded-md transition-colors ${linkFilter === 'pending' ? 'bg-[var(--accent)] text-[#0b0f1a]' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                      >
                        Pending ({pendingCount})
                      </button>
                      <button
                        onClick={() => setLinkFilter('checked')}
                        className={`px-2.5 py-0.5 rounded-md transition-colors ${linkFilter === 'checked' ? 'bg-[var(--accent)] text-[#0b0f1a]' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                      >
                        Checked ({checkedCount})
                      </button>
                    </div>

                    {/* Check All / Uncheck All button */}
                    <button
                      onClick={() => toggleAllLinksChecked(!allChecked)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg surface hover:bg-[var(--surface-bg)] text-[var(--foreground)] border border-[var(--surface-border)] transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {allChecked ? 'Uncheck All' : 'Select All'}
                    </button>
                  </div>
                </div>
              )}

              {/* Links List */}
              <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2.5 bg-[var(--background)]">
                {links.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-[var(--surface-bg)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)] mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[var(--foreground)]">No Source Links Found</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs mt-1">This document doesn't contain any external URLs or source links.</p>
                  </div>
                ) : filteredLinks.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                    No links matching current filter or search query.
                  </div>
                ) : (
                  filteredLinks.map(({ link, originalIndex }) => {
                    const isVisited = visitedLinks.has(link);
                    const isChecked = !!checkedLinks[link];
                    const isExpanded = expandedLinks.has(link);
                    const meta = getCachedLinkMetadata(link);
                    const domain = getDomain(link);

                    return (
                      <div 
                        key={originalIndex} 
                        className={`group relative flex flex-col bg-[var(--surface-bg)] p-3 rounded-xl border border-[var(--surface-border)] hover:border-[var(--accent)] transition-all ${
                          isChecked ? 'bg-[var(--surface-bg)]/60 opacity-80' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                            {/* 1. Counter Pill (e.g. 1., 2., 3.) */}
                            <span 
                              className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-1 rounded-lg shrink-0 select-none min-w-[28px] text-center"
                              title={`Link #${originalIndex + 1}`}
                            >
                              {originalIndex + 1}.
                            </span>

                            {/* Checklist Checkbox */}
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleLinkChecked(link)}
                              className="custom-checkbox shrink-0"
                              title={isChecked ? "Uncheck link" : "Check link"}
                            />

                            {/* Link Text and Info */}
                            <div className="flex flex-col min-w-0 flex-1 gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--surface-border)] text-[var(--text-muted)] shrink-0">
                                  {domain}
                                </span>
                                {isVisited && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                    Visited
                                  </span>
                                )}
                                {isChecked && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                    ✓ Checked
                                  </span>
                                )}
                              </div>
                              <span 
                                className={`text-xs text-[var(--foreground)] font-mono truncate select-all ${
                                  isChecked ? 'line-through text-[var(--text-muted)]' : isVisited ? 'text-[var(--text-muted)]' : ''
                                }`}
                                title={link}
                              >
                                {link}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Copy Link Button */}
                            <button 
                              onClick={() => handleCopy(link)}
                              className={`p-2 rounded-lg transition-colors border text-[var(--foreground)] ${
                                copiedLink === link 
                                  ? 'bg-emerald-500 text-white border-emerald-500' 
                                  : 'bg-[var(--background)] hover:bg-emerald-600 hover:text-white border-[var(--surface-border)]'
                              }`}
                              title="Copy link URL"
                            >
                              {copiedLink === link ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              )}
                            </button>

                            {/* Open External Link Button */}
                            <a 
                              href={link} 
                              onClick={() => handleLinkVisit(link)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-[var(--background)] rounded-lg hover:bg-[var(--accent)] hover:text-[#0b0f1a] transition-colors border border-[var(--surface-border)] text-[var(--foreground)] flex items-center justify-center"
                              title="Open link in browser"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>

                            {/* Dropdown Expand Toggle Button */}
                            <button
                              onClick={() => toggleExpandLink(link)}
                              className={`p-2 rounded-lg transition-colors border text-[var(--foreground)] ${
                                isExpanded 
                                  ? 'bg-[var(--accent)] text-[#0b0f1a] border-[var(--accent)] font-bold' 
                                  : 'bg-[var(--background)] hover:bg-[var(--surface-bg)] border-[var(--surface-border)]'
                              }`}
                              title={isExpanded ? "Collapse preview" : "Expand preview & details"}
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Preview Panel */}
                        {isExpanded && (
                          <div className="w-full mt-3 pt-3 border-t border-[var(--surface-border)]/60 bg-[var(--background)]/90 p-3.5 rounded-xl border border-[var(--surface-border)] space-y-2 animate-content-fade">
                            {meta?.loading ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] py-2">
                                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping shrink-0"></span>
                                <span>Fetching page preview & video info...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start gap-3">
                                  {meta?.thumbnail && (
                                    <img 
                                      src={meta.thumbnail} 
                                      alt="Preview thumbnail"
                                      className="w-24 h-16 object-cover rounded-lg border border-[var(--surface-border)] shrink-0 shadow-sm"
                                    />
                                  )}
                                  <div className="flex flex-col min-w-0 flex-1 gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-0.5 rounded">
                                        {meta?.provider || domain}
                                      </span>
                                      {meta?.author && (
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] truncate">
                                          by {meta.author}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs font-bold text-[var(--foreground)] leading-snug truncate" title={meta?.title}>
                                      {meta?.title || link}
                                    </h4>
                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                                      {meta?.description || 'No summary description available for this link.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-[var(--surface-border)] bg-[var(--surface-bg)] items-center flex justify-end rounded-b-2xl">
                {totalCount > 0 && (
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Total Links: {totalCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Status Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${isStatusModalOpen ? '' : 'hidden'}`}>
        <div className="absolute inset-0 modal-overlay" onClick={() => setStatusModalOpen(false)}></div>
        <div className={`relative surface border-[var(--surface-border)] rounded-2xl w-full max-w-md shadow-xl p-4 flex flex-col items-center max-h-[80vh] bg-[var(--surface-bg)] ${isStatusModalOpen ? 'animate-modal-pop' : ''}`}>
          <div className="h-12 w-12 rounded-full bg-[var(--background)] flex items-center justify-center mb-4 flex-shrink-0 border border-[var(--surface-border)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2 flex-shrink-0">Import Successful!</h2>
          <p className="text-[var(--text-muted)] text-sm text-center mb-6 flex-shrink-0">
            Found {importReport?.count || 0} A rolls.
          </p>
          
          {(importReport?.warnings?.length ?? 0) > 0 && (
            <div className="w-full bg-[var(--background)] border border-[var(--surface-border)] rounded-xl p-3 mb-6 flex-col flex-1 min-h-0 flex">
              <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide mb-2 flex items-center gap-2 flex-shrink-0">
                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Status:
              </h3>
              <ul className="text-[12px] text-[var(--text-muted)] space-y-2 list-disc list-inside font-mono overflow-y-auto pr-1">
                {importReport?.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <button onClick={() => setStatusModalOpen(false)} className="w-full py-2.5 bg-[var(--accent)] hover:bg-cyan-500 border-transparent rounded-xl text-sm font-bold text-[#0b0f1a] active:scale-95 transition-all flex-shrink-0 shadow-sm">
            Start Editing
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center ${isSettingsModalOpen ? '' : 'hidden'}`}>
        <div className="absolute inset-0 modal-overlay" onClick={() => setSettingsModalOpen(false)}></div>
        <div className={`relative surface border-[var(--surface-border)] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl bg-[var(--surface-bg)] overflow-hidden ${isSettingsModalOpen ? 'animate-modal-pop' : ''}`}>
          <div className="py-3 px-5 border-b border-[var(--surface-border)] flex justify-between items-center bg-[var(--background)]">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-base font-bold text-[var(--foreground)] tracking-wide">Settings</h2>
            </div>
            <button onClick={() => setSettingsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--background)]">
             {/* General Section */}
             <div className="surface rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-xs">
                <button 
                  onClick={() => toggleSection('general')}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-[var(--foreground)] bg-[var(--surface-bg)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    General
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${openSections.has('general') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openSections.has('general') && (
                  <div className="p-4 border-t border-[var(--surface-border)] space-y-4">
                    <div className="flex items-center justify-between group/wide relative">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Widescreen Mode</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">Hides sidebar and titlebar for focus.</p>
                      </div>
                      
                      <button 
                        onClick={() => toggleWidescreen()}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${isWidescreen ? 'bg-[var(--accent)]' : 'bg-[var(--surface-border)]'}`}
                      >
                        <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform duration-200 ${isWidescreen ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="h-px bg-[var(--surface-border)] opacity-20 w-full"></div>

                    <div className="flex items-center justify-between group/perf relative">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Performance Mode</span>
                          <div className="relative group/tooltip">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[var(--accent)] cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 text-[13px] text-white rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-[100] shadow-xl border border-white/10 text-center">
                              Warning: Disabling visual designs will shift the app to a basic mode for maximum performance.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95"></div>
                            </div>
                          </div>
                        </div>
                        <p className="text-[12px] text-[var(--text-muted)] italic">Disables glows, glass, and aurora.</p>
                      </div>
                      
                      <button 
                        onClick={() => setPerformanceMode(!performanceMode)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${performanceMode ? 'bg-[var(--accent)]' : 'bg-[var(--surface-border)]'}`}
                      >
                        <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform duration-200 ${performanceMode ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between group/badges relative">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Show Indicator Badges</span>
                          <div className="relative group/tooltip">
                            <div className="flex items-center justify-center h-5 w-5 bg-amber-500/20 text-amber-500 rounded-full cursor-help">
                              <span className="text-[12px] font-black">!</span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 text-[13px] text-white rounded-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-[100] shadow-xl border border-white/10 text-center">
                              Warning: Disabling badges might make you forget that there are editor notes waiting for you.
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95"></div>
                            </div>
                          </div>
                        </div>
                        <p className="text-[12px] text-[var(--text-muted)] italic leading-relaxed">Toggles counting badges on sidebar icons.</p>
                      </div>
                      
                      <button 
                        onClick={() => setShowBadges(!showBadges)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${showBadges ? 'bg-amber-500' : 'bg-[var(--surface-border)]'}`}
                      >
                        <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform duration-200 ${showBadges ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 py-1">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Image Extraction Path</span>
                          <p className="text-[12px] text-[var(--text-muted)] italic">Folder where extracted docx images are saved.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {imageExtractionPath && (
                            <button
                              onClick={() => setImageExtractionPath(null)}
                              className="px-2 py-1 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Reset to default"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                const selected = await open({
                                  directory: true,
                                  multiple: false,
                                  title: 'Select Image Extraction Folder'
                                });
                                if (selected && typeof selected === 'string') {
                                  setImageExtractionPath(selected);
                                }
                              } catch (e) {
                                console.error('Failed to select directory', e);
                              }
                            }}
                            className="px-3 py-1.5 bg-[var(--surface-border)]/40 hover:bg-[var(--accent)] hover:text-white text-[12px] font-bold text-[var(--foreground)] rounded-lg transition-colors cursor-pointer"
                          >
                            Browse...
                          </button>
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-black/20 rounded-lg border border-[var(--surface-border)]/50 text-[11px] font-mono text-[var(--text-muted)] truncate select-all">
                        {imageExtractionPath || "Default: [DocxName]_images alongside script"}
                      </div>
                    </div>

                    <div className="h-px bg-[var(--surface-border)] opacity-10 w-full"></div>

                    {/* Application Statistics Section inside General Settings */}
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Application Statistics</span>
                        </div>
                        <button
                          onClick={async () => {
                            const confirmed = await ask('Are you sure you want to reset your lifetime statistics? This cannot be undone.', {
                              title: 'Reset Statistics',
                              kind: 'warning',
                              okLabel: 'Reset Stats',
                              cancelLabel: 'Cancel'
                            });
                            if (confirmed) {
                              await resetStats();
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset Stats
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-2 text-cyan-500 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Current Session</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--foreground)] font-mono">{formatHumanTime(sessionSeconds)}</span>
                        </div>

                        <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-2 text-blue-500 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Lifetime Uptime</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--foreground)] font-mono">{formatHumanTime(stats.lifetimeSeconds)}</span>
                        </div>

                        <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-2 text-emerald-500 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Clips Logged</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--foreground)] font-mono">{stats.totalARollCount}</span>
                        </div>

                        <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl p-3 flex flex-col justify-between">
                          <div className="flex items-center gap-2 text-purple-500 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Footage Processed</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--foreground)] font-mono">{formatHumanTime(stats.totalDurationLogged)}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-[var(--text-muted)] italic tracking-wide text-right">
                        Last Active: {stats.lastUsedDate}
                      </p>
                    </div>

                    <div className="h-px bg-[var(--surface-border)] opacity-10 w-full"></div>

                    {/* Aurora Controls */}
                    <div className="space-y-6 py-3">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Aurora Size</span>
                              <div className="relative group/aurora-tooltip">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[var(--accent)] cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 text-[13px] text-white rounded-xl opacity-0 pointer-events-none group-hover/aurora-tooltip:opacity-100 transition-opacity z-[100] shadow-2xl border border-white/10 text-center">
                                  This is for the giant glowing bwobs on the background feel free to scale or disable them
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95"></div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[12px] text-[var(--text-muted)] italic leading-relaxed">Scales the background "bwobs".</p>
                          </div>
                          <span className="text-[13px] font-mono text-[var(--accent)] font-bold bg-[var(--accent)]/10 px-3 py-1.5 rounded-md">{auroraSize.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2.0" step="0.1" 
                          value={auroraSize} 
                          onChange={(e) => setAuroraSize(parseFloat(e.target.value))}
                          className="w-full h-3 bg-[var(--background)] border border-[var(--surface-border)] rounded-full appearance-none cursor-pointer accent-[var(--accent)] transition-all"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Aurora Vibrancy</span>
                            <p className="text-[12px] text-[var(--text-muted)] italic leading-relaxed">Adjusts glow intensity.</p>
                          </div>
                          <span className="text-[13px] font-mono text-[var(--accent)] font-bold bg-[var(--accent)]/10 px-3 py-1.5 rounded-md">{Math.round(auroraOpacity * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1.0" step="0.05" 
                          value={auroraOpacity} 
                          onChange={(e) => setAuroraOpacity(parseFloat(e.target.value))}
                          className="w-full h-3 bg-[var(--background)] border border-[var(--surface-border)] rounded-full appearance-none cursor-pointer accent-[var(--accent)] transition-all"
                        />
                      </div>
                    </div>

                    <div className="h-px bg-[var(--surface-border)] opacity-10 w-full"></div>

                    {/* Data Vault Access */}
                    <div className="flex items-center justify-between p-3.5 bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-[13px] text-[var(--foreground)] font-bold uppercase tracking-wider">Data Vault</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-muted)] italic">Manage active scripts, 30-day recycle bin, and metrics.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSettingsModalOpen(false);
                          setDataVaultOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl surface border border-[var(--surface-border)] hover:border-[var(--accent)] text-[var(--foreground)] hover:text-[var(--accent)] transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-bold bg-[var(--surface-bg)] group cursor-pointer"
                        title="Memory & Data Vault"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Data Vault</span>
                      </button>
                    </div>

                    <div className="h-px bg-[var(--surface-border)] opacity-10 w-full"></div>

                    <p className="text-[12px] text-[var(--text-muted)] font-bold uppercase tracking-wider">System Reset</p>
                    <div className="p-5 border-t border-[var(--surface-border)]">
                      <button 
                        onClick={async () => {
                          const confirmed = await ask(
                            'DANGER: This will PERMANENTLY ERASE your lifetime statistics and all stored data. Do you want to proceed with a factory reset?',
                            { title: 'Factory Reset', kind: 'warning', okLabel: 'Reset Everything', cancelLabel: 'Cancel' }
                          );
                          if (confirmed) {
                            factoryReset();
                          }
                        }}
                        className="w-full py-3.5 px-4 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white rounded-xl text-sm font-bold tracking-[0.1em] uppercase transition-all active:scale-95 shadow-lg shadow-rose-500/5 group"
                      >
                        <span className="group-hover:tracking-[0.15em] transition-all">Reset to Default</span>
                      </button>
                    </div>
                  </div>
                )}
             </div>

             {/* Theme Section */}
              <div className="surface rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-xs">
                <button 
                  onClick={() => toggleSection('theme')}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-[var(--foreground)] bg-[var(--surface-bg)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Theme Mode
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${openSections.has('theme') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openSections.has('theme') && (
                  <div className="p-4 border-t border-[var(--surface-border)] space-y-5">
                    {/* Theme Mode Selector */}
                    <div className="space-y-3">
                      <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Appearance</p>
                      <div className="flex bg-[var(--background)] p-1 rounded-xl border border-[var(--surface-border)]">
                        {(['light', 'dark', 'system'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setThemeMode(mode)}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                              themeMode === mode 
                                ? 'bg-[var(--accent)] text-[#0b0f1a] shadow-xs' 
                                : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Choose Theme Preset</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button 
                        onClick={() => setDarkVariant('blue')}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${darkVariant === 'blue' ? 'border-[var(--accent)] bg-[var(--surface-bg)]' : 'border-transparent bg-[var(--background)] hover:bg-[var(--surface-bg)]'}`}
                      >
                         <div className="w-9 h-9 rounded-full border border-[var(--surface-border)] shadow-inner overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f7ff 50%, #0b0f1a 50%)' }}></div>
                         <span className="text-[10px] font-bold text-center">Ocean Deep</span>
                         {darkVariant === 'blue' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--surface-bg)]"></div>}
                      </button>
                    
                      <button 
                        onClick={() => setDarkVariant('black')}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${darkVariant === 'black' ? 'border-[var(--accent)] bg-[var(--surface-bg)]' : 'border-transparent bg-[var(--background)] hover:bg-[var(--surface-bg)]'}`}
                      >
                         <div className="w-9 h-9 rounded-full border border-[var(--surface-border)] shadow-inner overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 50%, #000000 50%)' }}></div>
                         <span className="text-[10px] font-bold">Monotone</span>
                         {darkVariant === 'black' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--surface-bg)]"></div>}
                      </button>

                      <button 
                        onClick={() => setDarkVariant('gray')}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${darkVariant === 'gray' ? 'border-[var(--accent)] bg-[var(--surface-bg)]' : 'border-transparent bg-[var(--background)] hover:bg-[var(--surface-bg)]'}`}
                      >
                         <div className="w-9 h-9 rounded-full border border-[var(--surface-border)] shadow-inner overflow-hidden" style={{ background: 'linear-gradient(135deg, #f5f5f7 50%, #181818 50%)' }}></div>
                         <span className="text-[10px] font-bold">Gray</span>
                         {darkVariant === 'gray' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--surface-bg)]"></div>}
                      </button>

                      <button 
                        onClick={() => setDarkVariant('pink')}
                        className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${darkVariant === 'pink' ? 'border-[var(--accent)] bg-[var(--surface-bg)]' : 'border-transparent bg-[var(--background)] hover:bg-[var(--surface-bg)]'}`}
                      >
                         <div className="w-9 h-9 rounded-full border border-[var(--surface-border)] shadow-inner overflow-hidden" style={{ background: 'linear-gradient(135deg, #fff1f2 50%, #1e1b1e 50%)' }}></div>
                         <span className="text-[10px] font-bold">Femboy Pink</span>
                         {darkVariant === 'pink' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent)] rounded-full border-2 border-[var(--surface-bg)]"></div>}
                      </button>
                    </div>
                  </div>
                )}
             </div>


             {/* Developer Section */}
             <div className="surface rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-xs">
                <button 
                  onClick={() => toggleSection('developer')}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-[var(--foreground)] bg-[var(--surface-bg)] hover:bg-[var(--background)] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Developer Logs
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${openSections.has('developer') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openSections.has('developer') && (
                  <div className="p-4 border-t border-[var(--surface-border)] space-y-3">
                    <p className="text-xs text-[var(--text-muted)] italic">
                      Live event stream for drag-and-drop, video file loading, store state, and backend errors.
                    </p>
                    <DeveloperLogsConsole />
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </>
  );
};
