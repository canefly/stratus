import { useEffect, useState } from 'react';
import { useParserStore } from './store/useParserStore';
import { Sidebar } from './components/Sidebar';
import { HomeDashboard } from './components/HomeDashboard';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { CopyrightHelperView } from './components/CopyrightHelperView';
import { Modals } from './components/Modals';
import { DataVault } from './components/DataVault';
import { TitleBar } from './components/TitleBar';
import { AuroraBackground } from './components/AuroraBackground';
import { listen } from '@tauri-apps/api/event';
import { logger } from './lib/logger';
import './styles/globals.css';

function App() {
  const { 
    content, themeMode, darkVariant, initStore, 
    incrementSecond, performanceMode,
    isParsing,
    isWidescreen, toggleWidescreen, widescreenHotkey,
    showWidePopup, triggerWidePopup, isCopyrightOpen
  } = useParserStore();
  const [isDragging, setIsDragging] = useState(false);
  const hasContent = !!content;

  useEffect(() => {
    initStore();
    
    const uptimeInterval = setInterval(() => {
      incrementSecond();
    }, 1000);

    // Widescreen shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable;
      if (isInput) return;

      const keys = widescreenHotkey.split('+');
      const needsShift = keys.includes('Shift');
      const targetKey = keys.find(k => k !== 'Shift')?.toLowerCase();

      if (e.key.toLowerCase() === targetKey && (needsShift ? e.shiftKey : true) && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleWidescreen();
        triggerWidePopup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Prevent default browser context menu (custom context menus are handled per-component)
    const handleContext = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContext);

    // Tauri drag-drop listener
    let unlistenDragDrop: (() => void) | null = null;
    let isCancelled = false;

    listen<any>('tauri://drag-drop', (event) => {
        setIsDragging(false);
        const payload = event.payload;
        logger.log('drag', 'TauriEvent', 'tauri://drag-drop event received', payload);

        if (payload && payload.type && payload.type !== 'drop') {
            logger.log('debug', 'TauriEvent', `Skipping non-drop event phase: ${payload.type}`);
            return;
        }

        let paths: string[] = [];
        if (Array.isArray(payload)) {
          paths = payload;
        } else if (payload && Array.isArray(payload.paths)) {
          paths = payload.paths;
        }

        logger.log('drag', 'TauriEvent', `Extracted ${paths.length} file path(s)`, paths);

        if (paths.length > 0) {
            const filePath = paths[0];
            const parts = filePath.split('.');
            const rawExt = parts.length > 1 ? parts.pop() : '';
            const ext = (rawExt || '').trim().toLowerCase();
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'ogv', 'flv', 'mp3', 'wav'].includes(ext);
            const store = useParserStore.getState();

            logger.log('info', 'DragRouting', `File: "${filePath}" | Ext: "${ext}" | isVideo: ${isVideo} | isCopyrightOpen: ${store.isCopyrightOpen}`);

            if (store.isCopyrightOpen || isVideo) {
                logger.log('info', 'DragRouting', `Routing file to Copyright Helper: ${filePath}`);
                store.setCopyrightVideoPath(filePath);
                if (!store.isCopyrightOpen) {
                    store.setCopyrightOpen(true);
                }
            } else if (ext === 'docx') {
                logger.log('info', 'DragRouting', `Routing file to Script Parser: ${filePath}`);
                store.parseFile(filePath);
            } else {
                logger.log('info', 'DragRouting', `Fallback routing to Copyright Helper: ${filePath}`);
                store.setCopyrightVideoPath(filePath);
                store.setCopyrightOpen(true);
            }
        }
    }).then(u => {
        if (isCancelled) {
          u();
        } else {
          unlistenDragDrop = u;
        }
    });

    const onEnter = () => setIsDragging(true);
    const onLeave = (e: DragEvent) => {
        if (!e.relatedTarget) setIsDragging(false);
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);

    return () => {
      isCancelled = true;
      clearInterval(uptimeInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContext);
      if (unlistenDragDrop) unlistenDragDrop();
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
    };
  }, [initStore, incrementSecond, widescreenHotkey, toggleWidescreen]);

  useEffect(() => {
    // Disable transitions globally during theme switch to prevent UI lag
    document.body.classList.add('no-transitions');

    document.documentElement.setAttribute('data-theme', darkVariant);
    
    // Theme resolution logic
    const resolveTheme = () => {
      if (themeMode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeMode as 'dark' | 'light';
    };

    const applyTheme = () => {
      const activeTheme = resolveTheme();
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    // Listener for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themeMode === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Performance Mode application
    if (performanceMode) {
      document.documentElement.classList.add('perf-mode');
    } else {
      document.documentElement.classList.remove('perf-mode');
    }

    // Restore transitions after the DOM has settled
    const timer = setTimeout(() => {
      document.body.classList.remove('no-transitions');
    }, 10);

    return () => {
      clearTimeout(timer);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode, darkVariant, performanceMode]);

  const renderContent = () => {
    return (
      <div className="flex-1 flex min-h-0">
        {!isWidescreen && <Sidebar />}
        
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className={`flex-1 relative ${isWidescreen ? 'p-0' : 'p-3'} flex flex-col overflow-hidden transition-all duration-500`}>
            {isCopyrightOpen ? (
              <CopyrightHelperView />
            ) : hasContent ? (
              <SplitViewWorkspace />
            ) : (
              <HomeDashboard />
            )}

            {/* Minimal Drag & Drop Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-[100] p-6 pointer-events-none animate-in fade-in duration-200">
                  <div className="w-full h-full border-2 border-dashed border-[var(--accent)]/40 rounded-3xl bg-[var(--accent)]/5 flex flex-col items-center justify-center gap-4">
                      <div className="p-4 bg-[var(--accent)]/10 rounded-full border border-[var(--accent)]/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                      </div>
                      <span className="text-[var(--accent)] font-bold text-sm tracking-widest uppercase">Drop to Import</span>
                  </div>
              </div>
            )}

            {/* Standard Loading State */}
            {isParsing && (
              <div className="absolute inset-0 z-[110] bg-black/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto animate-in fade-in duration-200">
                  <div className="bg-[var(--surface-bg)] border border-[var(--surface-border)] p-10 rounded-2xl shadow-2xl flex flex-col items-center gap-6 min-w-[320px]">
                      <div className="w-full space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[var(--foreground)] uppercase tracking-[0.2em]">Parsing Script</span>
                          <span className="text-[10px] font-mono text-[var(--accent)] font-bold">PLEASE WAIT...</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--background)] border border-[var(--surface-border)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] animate-fake-progress shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]"></div>
                        </div>
                      </div>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans h-screen flex flex-col overflow-hidden transition-colors duration-300 antialiased text-[var(--foreground)] bg-transparent relative">
      <AuroraBackground />
      
      <div 
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%271.5%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix type=%27saturate%27 values=%270%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E")',
          opacity: 0.015,
          mixBlendMode: "normal"
        }} 
      />
      
      <div className="relative z-10 flex flex-col h-full w-full">
        <div className={isWidescreen ? "absolute top-0 left-0 w-full z-50" : ""}>
          <TitleBar />
        </div>
        {renderContent()}
        <Modals />
        <DataVault />
      </div>

      {/* Widescreen Exit Reminder Popup */}
      {showWidePopup && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-modal-pop">
           <div className="px-6 py-3 bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></div>
              <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                To exit wide screen "{widescreenHotkey}"
              </span>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
