import { saveDocumentState, setDbSetting } from '../lib/db';
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ParsedItem, ParsedNote } from '../lib/parser';
import { logger } from '../lib/logger';

export const normalizeLink = (link: string) => {
  if (!link || link === '#') return link;

  // YouTube specific normalization: extract 11-char video ID and format to clean youtu.be link
  const youtubePatterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of youtubePatterns) {
    const match = link.match(pattern);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  // Remove fragments like #t=123
  let clean = link.split('#')[0];
  
  if (clean.includes('drive.google.com')) {
    // Strip /view and everything after it
    clean = clean.replace(/\/(?:view|edit|preview|copy|sharing).*$/, '');
    
    // For file ID links, strip all query params
    if (clean.includes('/file/d/')) {
      clean = clean.split('?')[0];
    }
    
    // Handle the ?.xxxxxx pattern
    clean = clean.replace(/[?&]\.[\d]+$/, '');
  }

  // Remove common timestamp parameters for other links
  clean = clean.replace(/([?&])(?:t|time|start|timestamp|at)=\d+&?/g, '$1');
  
  // Clean up trailing ? or &
  clean = clean.replace(/[?&]$/, '');
  return clean.trim();
};

export interface CustomNote {
  id: string;
  blockId: number;
  selectedText: string;
  comment?: string;
  timestamp: number;
}

export interface GamificationStats {
  lifetimeSeconds: number;
  totalARollCount: number;
  totalDurationLogged: number;
  lastUsedDate: string;
}

export interface RecentFile {
  name: string;
  path: string;
  date: string; // ISO string for relative calculation
}

interface ParserState {
  file: File | null;
  content: string | null;
  isParsing: boolean;
  error: string | null;
  items: ParsedItem[];
  links: string[];
  checkedLinks: Record<string, boolean>;
  notes: ParsedNote[];
  customNotes: CustomNote[];
  recentFiles: RecentFile[];
  linkColors: Record<string, string>;
  
  // Modals state
  isNotesModalOpen: boolean;
  isLinkModalOpen: boolean;
  isStatusModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isStatsModalOpen: boolean;
  isDataVaultOpen: boolean;
  setDataVaultOpen: (isOpen: boolean) => void;
  isCopyrightOpen: boolean;
  copyrightVideoPath: string | null;
  importReport: { count: number; warnings: string[] } | null;
  themeMode: 'dark' | 'light' | 'system';
  darkVariant: 'blue' | 'black' | 'gray' | 'pink';
  showCopied: boolean;
  fileSignature: string | null;
  stats: GamificationStats;
  performanceMode: boolean;
  showBadges: boolean;
  sessionSeconds: number;
  auroraSize: number;
  auroraOpacity: number;
  isWidescreen: boolean;
  widescreenHotkey: string;
  showWidePopup: boolean;
  isTimelineHidden: boolean;
  imageExtractionPath: string | null;
  isDocTabsOpen: boolean;

  // Actions
  setFile: (file: File | null) => void;
  setContent: (content: string | null) => void;
  setParsing: (isParsing: boolean) => void;
  setError: (error: string | null) => void;
  setItems: (items: ParsedItem[]) => void;
  setLinks: (links: string[]) => void;
  toggleLinkChecked: (link: string) => void;
  toggleAllLinksChecked: (checked: boolean) => void;
  clearCheckedLinks: () => void;
  setNotes: (notes: ParsedNote[]) => void;
  checkedNotes: Record<string, boolean>;
  toggleNoteChecked: (noteId: string) => void;
  toggleAllNotesChecked: (checked: boolean) => void;
  addCustomNote: (note: CustomNote) => void;
  removeCustomNote: (id: string) => void;
  
  toggleItemChecked: (index: number, forceState?: boolean) => void;
  
  setNotesModalOpen: (isOpen: boolean) => void;
  setLinkModalOpen: (isOpen: boolean) => void;
  setStatusModalOpen: (isOpen: boolean, report?: { count: number; warnings: string[] }) => void;
  setSettingsModalOpen: (isOpen: boolean) => void;
  setStatsModalOpen: (isOpen: boolean) => void;
  setCopyrightOpen: (isOpen: boolean) => void;
  setCopyrightVideoPath: (path: string | null) => void;
  setDarkVariant: (variant: 'blue' | 'black' | 'gray' | 'pink') => void;
  triggerCopiedFeedback: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleWidescreen: () => void;
  triggerWidePopup: () => void;
  setFileSignature: (signature: string | null) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setShowBadges: (enabled: boolean) => void;
  setAuroraSize: (size: number) => void;
  setAuroraOpacity: (opacity: number) => void;
  restoreProgress: () => Promise<void>;
  
  addRecentFile: (name: string, path: string) => Promise<void>;
  parseFile: (path: string) => Promise<void>;

  initStore: () => Promise<void>;
  incrementSecond: () => Promise<void>;
  factoryReset: () => Promise<void>;
  resetStats: () => Promise<void>;
  reset: () => void;
  setIsTimelineHidden: (hidden: boolean) => void;
  setImageExtractionPath: (path: string | null) => void;
  setIsDocTabsOpen: (open: boolean) => void;
  toggleDocTabs: () => void;
}

export const useParserStore = create<ParserState>((set, get) => ({
  file: null,
  content: null,
  isParsing: false,
  error: null,
  items: [],
  links: [],
  checkedLinks: {},
  notes: [],
  customNotes: [],
  recentFiles: [],
  linkColors: {},
  
  isNotesModalOpen: false,
  isLinkModalOpen: false,
  isStatusModalOpen: false,
  isSettingsModalOpen: false,
  isStatsModalOpen: false,
    isDataVaultOpen: false,
  isCopyrightOpen: false,
  copyrightVideoPath: null,
  importReport: null,
  themeMode: 'light',
  darkVariant: 'blue',
  showCopied: false,
  fileSignature: null,
  stats: {
    lifetimeSeconds: 0,
    totalARollCount: 0,
    totalDurationLogged: 0,
    lastUsedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  },
  performanceMode: false,
  showBadges: true, // Default to true
  sessionSeconds: 0,
  auroraSize: 1.0,
  auroraOpacity: 0.1,
  isWidescreen: false,
  widescreenHotkey: 'Shift+F',
  showWidePopup: false,
  isTimelineHidden: false,
  imageExtractionPath: null,
  isDocTabsOpen: false,

  setFile: (file) => set({ file }),
  setContent: (content) => set({ content }),
  setParsing: (isParsing) => set({ isParsing }),
  setError: (error) => set({ error }),
  setItems: (items) => set({ items }),
  setLinks: (links) => set({ links }),
  toggleLinkChecked: (link) => set((state) => {
    const next = { ...state.checkedLinks, [link]: !state.checkedLinks[link] };
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: next, notes: state.checkedNotes, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
    }
    return { checkedLinks: next };
  }),
  toggleAllLinksChecked: (checked) => set((state) => {
    const next: Record<string, boolean> = {};
    state.links.forEach(l => { next[l] = checked; });
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: next, notes: state.checkedNotes, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
    }
    return { checkedLinks: next };
  }),
  clearCheckedLinks: () => set((state) => {
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: {}, notes: state.checkedNotes, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
    }
    return { checkedLinks: {} };
  }),
  setNotes: (notes) => set({ notes }),
  checkedNotes: {},
  toggleNoteChecked: (noteId) => set((state) => {
    const next = { ...state.checkedNotes, [noteId]: !state.checkedNotes[noteId] };
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: state.checkedLinks, notes: next, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
    }
    return { checkedNotes: next };
  }),
  toggleAllNotesChecked: (checked) => set((state) => {
    const next: Record<string, boolean> = {};
    state.notes.forEach(n => { next[`n_${n.id}`] = checked; });
    state.customNotes.forEach(c => { next[`c_${c.id}`] = checked; });
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: state.checkedLinks, notes: next, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
    }
    return { checkedNotes: next };
  }),
  addCustomNote: (note) => set((state) => {
    const newNotes = [...state.customNotes, note];
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: state.checkedLinks, notes: state.checkedNotes, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(newNotes));
    }
    return { customNotes: newNotes };
  }),
  removeCustomNote: (id) => set((state) => {
    const newNotes = state.customNotes.filter(n => n.id !== id);
    if (state.fileSignature) {
      saveDocumentState(state.fileSignature, JSON.stringify({ links: state.checkedLinks, notes: state.checkedNotes, items: state.items.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(newNotes));
    }
    return { customNotes: newNotes };
  }),
  
  addRecentFile: async (name, path) => {
    const { recentFiles } = get();
    // Remove if exists to jump to top
    const filtered = recentFiles.filter(f => f.path !== path);
    const newList = [{ name, path, date: new Date().toISOString() }, ...filtered].slice(0, 5);
    
    set({ recentFiles: newList });
    try {
            setDbSetting('recentFiles', JSON.stringify(newList));
    } catch (e) {
      console.error("Failed to save recent files", e);
    }
  },

  parseFile: async (path) => {
    if (!path) return;
    const parts = path.split('.');
    const rawExt = parts.length > 1 ? parts.pop() : '';
    const ext = (rawExt || '').trim().toLowerCase();
    const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'ogv', 'flv', 'mp3', 'wav', 'aac'].includes(ext);

    if (isVideo) {
      set({ copyrightVideoPath: path, isCopyrightOpen: true });
      return;
    }

    if (ext !== 'docx' && ext !== '') {
      set({ copyrightVideoPath: path, isCopyrightOpen: true });
      return;
    }

    const { 
      setParsing, setError, setContent, setItems, setLinks, 
      setNotes, setStatusModalOpen, setFileSignature, restoreProgress,
      addRecentFile, recentFiles
    } = get();
    
    setParsing(true);
    setError(null);
    
    const signature = `stratus_prog_${path}`;
    setFileSignature(signature);

    try {
      const fileName = path.split(/[\\/]/).pop() || "Unknown Script";
      const imagePath = get().imageExtractionPath;
      const rawJson = await invoke<string>('parse_document', { path, imagePath });
      const result = JSON.parse(rawJson);
      
      if (result.error) throw new Error(result.error);
      
      set({ isCopyrightOpen: false });
      setContent(JSON.stringify(result.blocks));
      setItems(result.items);
        await restoreProgress();
      setLinks(result.links);
      
      // Generate colors for unique links
      const colors: Record<string, string> = {};
      if (result.links && result.links.length > 0) {
        const count = result.links.length;
        result.links.forEach((link: string, i: number) => {
          const hue = (i * (360 / count)) % 360;
          // Using HSL for better control over distinguishability
          colors[link] = `hsla(${hue}, 75%, 60%, 1)`;
        });
      }
      set({ linkColors: colors });

      setNotes(result.notes);
      setStatusModalOpen(true, result.report);
      
      await addRecentFile(fileName, path);
    } catch (err: any) {
      console.error("Parse Error:", err);
      // Special handling for missing files as per user request
      if (err.toString().toLowerCase().includes('not found') || err.toString().toLowerCase().includes('no such file')) {
        alert(`File not found or moved: ${path}`);
        
        // Remove from recent files
        const newList = recentFiles.filter(f => f.path !== path);
        set({ recentFiles: newList });
                setDbSetting('recentFiles', JSON.stringify(newList));
        
        setError('File not found or moved');
      } else {
        setError(err.message || 'Critical Import Error');
        alert("Critical Import Error: " + (err.message || err));
      }
    } finally {
      setParsing(false);
    }
  },
  
  toggleItemChecked: async (index, forceState) => {
    const state = get();
    const newItems = [...state.items];
    const targetItem = newItems[index];

    if (targetItem) {
      if (forceState !== undefined && targetItem.checked === forceState) {
        return; // Already in the correct state
      }
      
      const isNowChecked = forceState !== undefined ? forceState : !targetItem.checked;
      targetItem.checked = isNowChecked;
      
      let durationDiff = 0;
      let countDiff = isNowChecked ? 1 : -1;
      
      if (!targetItem.isSingle && targetItem.duration) {
         durationDiff = isNowChecked ? targetItem.duration : -targetItem.duration;
      }
      
      const newStats = {
         ...state.stats,
         totalARollCount: Math.max(0, state.stats.totalARollCount + countDiff),
         totalDurationLogged: Math.max(0, state.stats.totalDurationLogged + durationDiff)
      };

      set({ items: newItems, stats: newStats });

      // Auto-save progress
      if (state.fileSignature) {
        saveDocumentState(state.fileSignature, JSON.stringify({ links: state.checkedLinks, notes: state.checkedNotes, items: newItems.map(i => ({ id: i.id, checked: i.checked })) }), JSON.stringify(state.customNotes));
      }

      try {
              } catch(e) {
        console.error("Failed to save stats to Tauri store", e);
      }
    }
  },

  setNotesModalOpen: (isOpen) => set(isOpen ? { isNotesModalOpen: true, isLinkModalOpen: false, isSettingsModalOpen: false, isStatsModalOpen: false } : { isNotesModalOpen: false }),
  setLinkModalOpen: (isOpen) => set(isOpen ? { isLinkModalOpen: true, isNotesModalOpen: false, isSettingsModalOpen: false, isStatsModalOpen: false } : { isLinkModalOpen: false }),
  setStatusModalOpen: (isOpen, report) => set((state) => ({ 
    isStatusModalOpen: isOpen, 
    ...(isOpen ? { isNotesModalOpen: false, isLinkModalOpen: false, isSettingsModalOpen: false } : {}),
    importReport: report !== undefined ? report : state.importReport 
  })),
  setSettingsModalOpen: (isOpen) => set(isOpen ? { isSettingsModalOpen: true, isNotesModalOpen: false, isLinkModalOpen: false, isStatsModalOpen: false } : { isSettingsModalOpen: false }),
  setStatsModalOpen: (isOpen) => set(isOpen ? { isStatsModalOpen: true, isDataVaultOpen: false, isNotesModalOpen: false, isLinkModalOpen: false, isSettingsModalOpen: false } : { isStatsModalOpen: false }),
    setDataVaultOpen: (isOpen) => set(isOpen ? { isDataVaultOpen: true, isStatsModalOpen: false, isNotesModalOpen: false, isLinkModalOpen: false, isSettingsModalOpen: false } : { isDataVaultOpen: false }),
  setCopyrightOpen: (isOpen) => {
    logger.log('info', 'Store', `setCopyrightOpen(${isOpen})`);
    set({ isCopyrightOpen: isOpen });
  },
  setCopyrightVideoPath: (path) => {
    logger.log('info', 'Store', `setCopyrightVideoPath("${path}")`);
    set({ copyrightVideoPath: path });
  },
  setDarkVariant: (variant) => set(() => {
    setDbSetting('darkVariant', variant);
    return { darkVariant: variant };
  }),
  triggerCopiedFeedback: () => {
    set({ showCopied: true });
    setTimeout(() => set({ showCopied: false }), 2000);
  },
  setThemeMode: (mode) => set(() => {
    setDbSetting('themeMode', mode);
        return { themeMode: mode };
  }),
  toggleWidescreen: () => set((state) => {
    const next = !state.isWidescreen;
    setDbSetting('isWidescreen', next.toString());
        return { isWidescreen: next };
  }),
  triggerWidePopup: () => {
    set({ showWidePopup: true });
    setTimeout(() => set({ showWidePopup: false }), 3000);
  },
  setIsTimelineHidden: (hidden) => set(() => {
    setDbSetting('isTimelineHidden', hidden.toString());
        return { isTimelineHidden: hidden };
  }),
  setImageExtractionPath: (path) => set(() => {
    if (path) {
      setDbSetting('imageExtractionPath', path);
          } else {
      setDbSetting('imageExtractionPath', '');
          }
    return { imageExtractionPath: path };
  }),
  setIsDocTabsOpen: (open) => set(() => {
    setDbSetting('isDocTabsOpen', open.toString());
    return { isDocTabsOpen: open };
  }),
  toggleDocTabs: () => set((state) => {
    const next = !state.isDocTabsOpen;
    setDbSetting('isDocTabsOpen', next.toString());
    return { isDocTabsOpen: next };
  }),
  setFileSignature: (signature) => set({ fileSignature: signature }),
  setPerformanceMode: (enabled) => set(() => {
    setDbSetting('performanceMode', enabled.toString());
        return { performanceMode: enabled };
  }),
  setShowBadges: (enabled) => set(() => {
    setDbSetting('showBadges', enabled.toString());
        return { showBadges: enabled };
  }),
  setAuroraSize: (size) => set(() => {
    setDbSetting('auroraSize', size.toString());
        return { auroraSize: size };
  }),
  setAuroraOpacity: (opacity) => set(() => {
    setDbSetting('auroraOpacity', opacity.toString());
        return { auroraOpacity: opacity };
  }),
  restoreProgress: async () => {
    const state = get();
    if (!state.fileSignature) return;
    
    try {
      const { getDocumentState } = await import('../lib/db');
      const docState = await getDocumentState(state.fileSignature);
      
      let newItems = [...state.items];
      let newNotes = state.customNotes;
      let newCheckedLinks = state.checkedLinks;
      let newCheckedNotes = state.checkedNotes;
      
      if (docState) {
        if (docState.customNotesJson) {
          try { newNotes = JSON.parse(docState.customNotesJson); } catch(e) {}
        }
        if (docState.checklistJson) {
          try {
            const parsed = JSON.parse(docState.checklistJson);
            if (parsed.links) newCheckedLinks = parsed.links;
            if (parsed.notes) newCheckedNotes = parsed.notes;
            if (parsed.items && Array.isArray(parsed.items)) {
              newItems = state.items.map(item => {
                const saved = parsed.items.find((i: any) => i.id === item.id);
                return saved ? { ...item, checked: saved.checked } : item;
              });
            }
          } catch(e) {}
        }
      }
      set({ items: newItems, customNotes: newNotes, checkedLinks: newCheckedLinks, checkedNotes: newCheckedNotes });
    } catch(e) {
      console.error(e);
    }
  },

  initStore: async () => {
      try {
        const { getDbStats, getDbSetting } = await import('../lib/db');
        
        const savedStats = await getDbStats();
        const themeMode = (await getDbSetting('themeMode') as 'dark' | 'light' | 'system') || 'light';
        const darkVariant = (await getDbSetting('darkVariant') as 'blue' | 'black' | 'gray' | 'pink') || 'blue';
        const performanceMode = (await getDbSetting('performanceMode')) === 'true';
        const showBadges = (await getDbSetting('showBadges')) !== 'false';
        const auroraSize = parseFloat((await getDbSetting('auroraSize')) || '1.0');
        const auroraOpacity = parseFloat((await getDbSetting('auroraOpacity')) || '0.1');
        const isWidescreen = (await getDbSetting('isWidescreen')) === 'true';
        const widescreenHotkey = (await getDbSetting('widescreenHotkey')) || 'Shift+F';
        const isTimelineHidden = (await getDbSetting('isTimelineHidden')) === 'true';
        const imageExtractionPath = await getDbSetting('imageExtractionPath');
        const isDocTabsOpen = (await getDbSetting('isDocTabsOpen')) === 'true';
        
        const savedRecentFilesRaw = await getDbSetting('recentFiles');
        const recentFiles = savedRecentFilesRaw ? JSON.parse(savedRecentFilesRaw) : [];

        set({
          stats: savedStats,
          themeMode, darkVariant, performanceMode, showBadges,
          auroraSize, auroraOpacity, isWidescreen, widescreenHotkey,
          isTimelineHidden, imageExtractionPath: imageExtractionPath || null, isDocTabsOpen,
          recentFiles
        });
        
      } catch (e) {
        console.error("Failed to load store", e);
      }
    },
    incrementSecond: async () => {
    const state = get();
    const newSessionSeconds = state.sessionSeconds + 1;
    const newLifetimeSeconds = state.stats.lifetimeSeconds + 1;
    
    const newStats = { ...state.stats, lifetimeSeconds: newLifetimeSeconds };
    set({ sessionSeconds: newSessionSeconds, stats: newStats });
    
    // Batch save to disk every 60 seconds to prevent performance degradation
    if (newLifetimeSeconds % 60 === 0) {
      try {
              } catch(e) {
        console.error("Failed to save lifetime uptime", e);
      }
    }
  },

  factoryReset: async () => {
    try {
                  
      set(() => ({
         file: null, content: null, isParsing: false, error: null, 
         items: [], links: [], checkedLinks: {}, notes: [], customNotes: [],
         isNotesModalOpen: false, isLinkModalOpen: false, isStatusModalOpen: false, isSettingsModalOpen: false,
         isStatsModalOpen: false,
    isDataVaultOpen: false,
          importReport: null, fileSignature: null,
          themeMode: 'light', darkVariant: 'blue', performanceMode: false,
          showBadges: true,
          recentFiles: [],
          sessionSeconds: 0,
          auroraSize: 1.0,
          auroraOpacity: 0.4,
          stats: { lifetimeSeconds: 0, totalARollCount: 0, totalDurationLogged: 0, lastUsedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
          isTimelineHidden: false
      }));
      setDbSetting('themeMode', '');
      setDbSetting('darkVariant', '');
      setDbSetting('performanceMode', '');
      setDbSetting('showBadges', '');
      setDbSetting('auroraSize', '');
      setDbSetting('auroraOpacity', '');
      setDbSetting('isTimelineHidden', '');
    } catch (e) {
      console.error("Failed to clear store", e);
    }
  },

  resetStats: async () => {
    try {
      const { resetDbStats } = await import('../lib/db');
      await resetDbStats();
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      set({
        stats: {
          lifetimeSeconds: 0,
          totalARollCount: 0,
          totalDurationLogged: 0,
          lastUsedDate: today
        }
      });
    } catch (e) {
      console.error("Failed to reset stats", e);
    }
  },

  reset: () => set(() => ({ 
    file: null, content: null, isParsing: false, error: null, 
    items: [], links: [], checkedLinks: {}, notes: [], customNotes: [],
    isNotesModalOpen: false, isLinkModalOpen: false, isStatusModalOpen: false, 
    importReport: null, fileSignature: null
    // do not reset theme mode
  })),
}));
