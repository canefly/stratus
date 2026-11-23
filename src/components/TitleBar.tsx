import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import { useParserStore } from '../store/useParserStore';
import logo from '../assets/logo.png';

export const TitleBar: React.FC = () => {
    // Tauri states
    const [isPinned, setIsPinned] = useState(false);
    
    let appWindow: any = null;
    try {
        appWindow = getCurrentWindow();
    } catch (e) {
        // Safe fallback when running in browser or during IPC initialization
    }

    const handlePin = () => {
        if (appWindow?.setAlwaysOnTop) {
            appWindow.setAlwaysOnTop(!isPinned);
            setIsPinned(!isPinned);
        }
    };

    const handleMinimize = () => appWindow?.minimize?.();
    const handleMaximize = () => appWindow?.toggleMaximize?.();
    const handleClose = () => appWindow?.close?.();

    // Store attributes for A-ROLL tracking
    const { 
        items, content, showCopied,
        isWidescreen, triggerWidePopup
    } = useParserStore();
    const hasContent = !!content;

    const totalSeconds = items.reduce((acc, item) => item.included ? acc + item.duration : acc, 0);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const totalDisplay = m >= 60 ? `${Math.floor(m/60)}h ${m%60}m ${s}s` : `${m}m ${s}s`;

    const totalCount = items.length;
    const doneCount = items.filter(i => i.checked).length;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
        <div data-tauri-drag-region className={`h-10 flex items-center pl-3 pr-1 select-none border-b shrink-0 z-[100] transition-all duration-700 relative ${
            isWidescreen 
                ? 'bg-transparent border-transparent' 
                : 'bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]'
        }`}>
            {/* Widescreen Drag/Functionality Blocker & Reminder */}
            {isWidescreen && (
                <div 
                    className="absolute inset-0 z-[101] cursor-default bg-transparent"
                    onClick={(e) => {
                        e.stopPropagation();
                        triggerWidePopup();
                    }}
                />
            )}
            {/* Left Section: Logo & Branding */}
            {!isWidescreen && (
              <div data-tauri-drag-region className="flex items-center gap-3 h-full select-none">
                <img src={logo} alt="Stratus Logo" className="w-6 h-6 select-none pointer-events-none" data-tauri-drag-region />
                <span data-tauri-drag-region className="text-[11px] font-bold text-[var(--foreground)] tracking-widest uppercase opacity-80 pointer-events-none">Stratus</span>
                <div className="w-[1px] h-4 bg-[var(--surface-border)] opacity-50" data-tauri-drag-region />
                <button 
                    onClick={() => openUrl('https://github.com/canefly/stratus')}
                    className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer relative z-[110]"
                >
                    github.com/canefly/stratus
                </button>
              </div>
            )}

            {/* Right Section: Workspace Stats & Window Controls */}
            <div data-tauri-drag-region className="ml-auto flex items-center h-full mr-6">

                {/* Workspace Contextual Stats */}
                {!isWidescreen && hasContent && (
                    <div data-tauri-drag-region className="flex items-center h-full">
                        <div className="w-[1px] h-4 bg-[var(--surface-border)] opacity-30 mr-4" data-tauri-drag-region />
                        
                        {/* Status Indicators (Absolute positioned to avoid layout shifts) */}
                        <div className="relative h-full flex items-center">
                            <div data-tauri-drag-region id="auto-save-indicator" className="absolute right-0 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 opacity-0 transition-all duration-500 pointer-events-none whitespace-nowrap">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                               Saved
                            </div>

                            <div data-tauri-drag-region className={`absolute right-0 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-cyan-500 transition-all duration-300 pointer-events-none whitespace-nowrap ${showCopied ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </div>
                        </div>

                        <div data-tauri-drag-region className="flex items-center h-full">
                           <span data-tauri-drag-region className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold pointer-events-none mr-2">A-Roll</span>
                           <span data-tauri-drag-region className="text-xs font-mono font-bold text-[var(--foreground)] pointer-events-none mr-4">{doneCount}/{totalCount} <span data-tauri-drag-region className="text-emerald-500 ml-0.5">{progressPercent}%</span></span>
                        </div>
                        
                        <div className="w-[1px] h-4 bg-[var(--surface-border)] opacity-50 mr-4" data-tauri-drag-region />
                        <div data-tauri-drag-region className="flex items-center h-full">
                           <span data-tauri-drag-region className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold pointer-events-none mr-2">Est. Total</span>
                           <span data-tauri-drag-region className="text-xs font-mono font-bold text-[var(--foreground)] pointer-events-none">{totalDisplay}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Native Window Controls */}
            {!isWidescreen && (
              <div className="flex items-center gap-0.5 relative z-[110]">
                  <button 
                    onClick={handlePin}
                    className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                      isPinned ? 'hover:bg-rose-500/10 text-rose-500' : 'hover:bg-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
                    }`}
                    title={isPinned ? 'Unpin' : 'Always on Top'}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61 l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271 c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"/>
                      </svg>
                  </button>
                  <button 
                    onClick={handleMinimize}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <button 
                    onClick={handleMaximize}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                  </button>
                  <button 
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-rose-500 hover:text-white text-[var(--text-muted)] transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>
            )}
        </div>
    );
};
