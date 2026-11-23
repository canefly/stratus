import React, { useState, useRef, useEffect } from 'react';
import { useParserStore } from '../store/useParserStore';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { logger } from '../lib/logger';

interface ParsedMarkerItem {
  title: string;
  type: string | null;
  start: number;
  end: number;
  duration: number;
  originalStr: string;
}

const DEFAULT_MARKER_PRESET = `[YouTube Fair Use]
Audio Visual
0:05 - 0:45
0:46 - 1:02

[Clip Commentary]
Visual
1:30 - 2:15
2:20 - 3:00

[Music Track Warning]
Audio
4:15 - 4:45`;

const PALETTE = ['#FF0055', '#00FFCC', '#CCFF00', '#BD00FF', '#FF9900', '#00CCFF', '#FF00CC', '#FFFF00'];

const parseSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
};

const formatTime = (s: number): string => {
  if (isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const CopyrightHelperView: React.FC = () => {
  const { copyrightVideoPath, setCopyrightOpen } = useParserStore();

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [assumedDuration, setAssumedDuration] = useState(600); // 10 minutes default assumed
  const [volume, setVolume] = useState(1);
  
  const [markerText, setMarkerText] = useState(DEFAULT_MARKER_PRESET);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMarkerItem[]>([]);
  const [sectionColors, setSectionColors] = useState<Record<string, string>>({});
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const effectiveDuration = duration > 0 ? duration : assumedDuration;

  const loadVideoFileFromPath = async (filePath: string) => {
    logger.log('info', 'CopyrightView', `Reading video file bytes via Rust: "${filePath}"`);
    try {
      const bytes = await invoke<number[]>('read_file_bytes', { path: filePath });
      logger.log('info', 'CopyrightView', `Rust read_file_bytes returned ${bytes.length} bytes for video`);
      const uint8 = new Uint8Array(bytes);

      const ext = filePath.split('.').pop()?.toLowerCase().trim() || 'mp4';
      let mimeType = 'video/mp4';
      if (ext === 'webm') mimeType = 'video/webm';
      if (ext === 'mkv') mimeType = 'video/x-matroska';
      if (ext === 'mov') mimeType = 'video/quicktime';
      if (ext === 'avi') mimeType = 'video/x-msvideo';

      const blob = new Blob([uint8], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      logger.log('info', 'CopyrightView', `Created in-memory Blob URL successfully: "${blobUrl}" (size=${blob.size})`);
      setVideoSrc(blobUrl);
    } catch (e) {
      logger.log('error', 'CopyrightView', 'Rust read_file_bytes failed, fallback to convertFileSrc', e);
      const normalizedPath = filePath.replace(/\\/g, '/');
      const assetUrl = convertFileSrc(normalizedPath);
      setVideoSrc(assetUrl);
    }
  };

  // React to dropped video file paths from Tauri
  useEffect(() => {
    if (copyrightVideoPath) {
      loadVideoFileFromPath(copyrightVideoPath);
    }
  }, [copyrightVideoPath]);

  // Parse marker text logic
  const parseMarkerText = (text: string) => {
    const lines = text.split('\n');
    const items: ParsedMarkerItem[] = [];
    const colors: Record<string, string> = { ...sectionColors };
    const vis: Record<string, boolean> = { ...sectionVisibility };

    let currentTitle = "Unknown Section";
    let currentType: string | null = null;
    let colorIdx = Object.keys(colors).length;
    const timeRegex = /(\d{1,2}:)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:)?(\d{1,2}:\d{2})/;
    const typeKeywords = ["audio visual", "visual", "audio"];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const timeMatch = trimmed.match(timeRegex);
      if (timeMatch) {
        const start = parseSeconds((timeMatch[1] || "") + timeMatch[2]);
        const end = parseSeconds((timeMatch[3] || "") + timeMatch[4]);
        items.push({
          title: currentTitle,
          type: currentType,
          start,
          end,
          duration: Math.max(0, end - start),
          originalStr: timeMatch[0]
        });
        return;
      }

      if (typeKeywords.includes(trimmed.toLowerCase())) {
        currentType = trimmed;
        return;
      }

      currentTitle = trimmed.replace(/[\[\]]/g, '');
      currentType = null;
      if (!colors[currentTitle]) {
        colors[currentTitle] = PALETTE[colorIdx % PALETTE.length];
        vis[currentTitle] = true;
        colorIdx++;
      }
    });

    setParsedData(items);
    setSectionColors(colors);
    setSectionVisibility(vis);
  };

  useEffect(() => {
    parseMarkerText(markerText);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current || !videoSrc) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const isVideoFile = (file: File) => {
    if (file.type && file.type.startsWith('video/')) return true;
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase().trim() : '';
    return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'ogv', 'flv'].includes(ext || '');
  };

  const handleVideoFile = (file: File) => {
    if (!file) {
      logger.log('warn', 'CopyrightView', 'handleVideoFile called with null/empty file');
      return;
    }
    logger.log('drag', 'CopyrightView', `HTML Drop file received: name="${file.name}", size=${file.size}, type="${file.type}"`);

    if (isVideoFile(file)) {
      const url = URL.createObjectURL(file);
      logger.log('info', 'CopyrightView', `Created object URL from Blob: "${url}"`);
      setVideoSrc(url);
    } else {
      logger.log('warn', 'CopyrightView', `File "${file.name}" rejected by isVideoFile check`);
    }
  };

  const handleBrowseVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv'] }]
      });
      logger.log('info', 'CopyrightView', `Tauri open dialog selected: "${selected}"`);
      if (selected && typeof selected === 'string') {
        loadVideoFileFromPath(selected);
      }
    } catch (e) {
      logger.log('error', 'CopyrightView', 'Browse video dialog error', e);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || effectiveDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = clickPct * effectiveDuration;

    if (videoRef.current && videoSrc) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    } else {
      setCurrentTime(targetTime);
    }
  };

  const seekToTime = (time: number) => {
    if (videoRef.current && videoSrc) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
      setIsPlaying(true);
    }
    setCurrentTime(time);
  };

  const toggleSectionVisibility = (title: string) => {
    setSectionVisibility(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleSetAssumedDuration = () => {
    const input = prompt("Enter assumed video length (e.g., 10:00 or 1:30:00):", formatTime(assumedDuration));
    if (input) {
      const secs = parseSeconds(input);
      if (secs > 0) {
        setAssumedDuration(secs);
      }
    }
  };

  // Group items by title
  const groupedData: Record<string, { items: ParsedMarkerItem[]; type: string | null }> = {};
  parsedData.forEach(item => {
    if (!groupedData[item.title]) {
      groupedData[item.title] = { items: [], type: item.type };
    }
    groupedData[item.title].items.push(item);
    if (item.type && !groupedData[item.title].type) {
      groupedData[item.title].type = item.type;
    }
  });

  const progressPct = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col surface border border-[var(--surface-border)] rounded-2xl shadow-xl bg-[var(--surface-bg)] overflow-hidden">
      
      {/* Sleek Navigation Bar */}
      <div className="py-2.5 px-5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--background)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-xs font-bold">
            🛡️
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--foreground)] tracking-wide">
              Copyright Helper
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded">DISCONTINUED</span>
          </div>
        </div>

        <button 
          onClick={() => setCopyrightOpen(false)}
          className="px-3 py-1.5 rounded-xl surface border border-[var(--surface-border)] hover:border-[var(--accent)] text-[var(--foreground)] hover:text-[var(--accent)] transition-all text-xs font-bold flex items-center gap-2"
          title="Return to Main View"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Main View</span>
        </button>
      </div>

      {/* Discontinued Notice */}
      <div className="px-5 py-2 bg-rose-500/10 border-b border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between gap-2 shrink-0">
        <span>
          <strong className="uppercase tracking-wider mr-1.5">Discontinued:</strong>
          This experimental tool is unoptimized and loads the entire video file into RAM instead of streaming from disk due to React/Tauri bridge constraints. Avoid importing large files.
        </span>
      </div>

      {/* Main Split View: Stage + Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-full">
        
        {/* Main Stage (Video + Timeline) */}
        <div 
          className={`lg:col-span-8 flex flex-col bg-black relative border-r border-[var(--surface-border)] ${isDragging ? 'ring-4 ring-[var(--accent)]' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleVideoFile(e.dataTransfer.files[0]);
            }
          }}
        >
          {/* Video Canvas Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black/90">
            {videoSrc ? (
              <video 
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                onClick={togglePlay}
                onError={(e) => {
                  const mediaErr = (e.target as HTMLVideoElement).error;
                  logger.log('error', 'VideoElement', 'HTML5 Video player onError triggered', {
                    code: mediaErr?.code,
                    message: mediaErr?.message,
                    currentSrc: (e.target as HTMLVideoElement).currentSrc
                  });
                }}
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    logger.log('info', 'VideoElement', `Loaded metadata successfully! Video duration: ${videoRef.current.duration}s`);
                    setDuration(videoRef.current.duration);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div 
                onClick={handleBrowseVideo}
                className="cursor-pointer flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[var(--surface-border)] rounded-2xl hover:border-[var(--accent)] transition-all group max-w-sm text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] group-hover:border-[var(--accent)] text-[var(--accent)] flex items-center justify-center transition-all group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-[var(--foreground)] tracking-wide">Drag & Drop Video Here</span>
                  <p className="text-[11px] text-[var(--text-muted)]">or click to browse video file</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Controls Bar */}
          <div className="p-4 bg-[var(--background)] border-t border-[var(--surface-border)] flex items-center gap-4 shrink-0">
            <button 
              onClick={togglePlay}
              disabled={!videoSrc}
              className="h-9 w-9 rounded-xl surface border border-[var(--surface-border)] text-[var(--foreground)] hover:text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-40 transition-all flex items-center justify-center shrink-0 active:scale-95"
              title={isPlaying ? "Pause Video" : "Play Video"}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            <span className="font-mono text-xs text-[var(--text-muted)] font-bold shrink-0 min-w-[90px]">
              {formatTime(currentTime)} / {formatTime(effectiveDuration)}
            </span>

            {/* Scrubber Timeline with Color Markers Layer */}
            <div 
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="flex-1 relative h-6 bg-[var(--surface-bg)] rounded-lg border border-[var(--surface-border)] cursor-pointer overflow-hidden group/timeline"
            >
              {/* Progress Fill */}
              <div 
                className="absolute top-0 left-0 bottom-0 bg-[var(--foreground)]/20 transition-all"
                style={{ width: `${progressPct}%` }}
              />

              {/* Marker Layer Overlay */}
              {parsedData.map((item, idx) => {
                if (!sectionVisibility[item.title] || effectiveDuration <= 0) return null;
                const startPct = (item.start / effectiveDuration) * 100;
                const widthPct = Math.max(0.5, ((item.end / effectiveDuration) * 100) - startPct);
                const color = sectionColors[item.title] || 'var(--accent)';

                return (
                  <div 
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      seekToTime(item.start);
                    }}
                    className="absolute top-0 bottom-0 opacity-75 hover:opacity-100 hover:scale-y-110 transition-all cursor-pointer border-x border-black/40"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: color
                    }}
                    title={`${item.title} (${item.duration}s)`}
                  />
                );
              })}

              {/* Playhead Line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] z-20 pointer-events-none"
                style={{ left: `${progressPct}%` }}
              />
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[var(--text-muted)]">🔊</span>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) videoRef.current.volume = val;
                }}
                className="w-16 h-2 bg-[var(--surface-bg)] accent-[var(--accent)] rounded-full cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar (Markers & Sections) */}
        <div className="lg:col-span-4 flex flex-col bg-[var(--surface-bg)] h-full overflow-hidden">
          
          {/* Sidebar Header & Action Buttons */}
          <div className="p-4 border-b border-[var(--surface-border)] bg-[var(--background)] flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Copyright Markers</h3>
              <button 
                onClick={handleSetAssumedDuration}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all bg-[var(--surface-bg)]"
                title="Set assumed video length when no video is loaded"
              >
                Set Length ({formatTime(assumedDuration)})
              </button>
            </div>

            <button 
              onClick={() => setIsManageModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-[var(--accent)] text-[#0b0f1a] font-bold text-xs hover:brightness-110 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Manage Markers Text</span>
            </button>
          </div>

          {/* Marker List Output */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {Object.keys(groupedData).length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                <p>No copyright markers loaded.</p>
                <button 
                  onClick={() => setIsManageModalOpen(true)}
                  className="text-[var(--accent)] font-bold hover:underline"
                >
                  Click "Manage Markers Text" to import.
                </button>
              </div>
            ) : (
              Object.entries(groupedData).map(([title, groupData], gIdx) => {
                const color = sectionColors[title] || 'var(--accent)';
                const isVisible = sectionVisibility[title] !== false;

                const durations = groupData.items.map(i => i.duration);
                const minDur = Math.min(...durations);
                const maxDur = Math.max(...durations);
                const range = maxDur - minDur;
                const tier1 = minDur + (range * 0.33);
                const tier2 = minDur + (range * 0.66);

                return (
                  <details 
                    key={gIdx} 
                    open 
                    className="surface border border-[var(--surface-border)] rounded-xl overflow-hidden group/details"
                  >
                    <summary className="p-3 bg-[var(--background)] cursor-pointer text-xs font-bold text-[var(--foreground)] flex items-center justify-between gap-2 select-none hover:bg-[var(--surface-bg)] transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Eye Toggle Visibility */}
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSectionVisibility(title);
                          }}
                          className={`p-1 rounded hover:bg-[var(--surface-border)] transition-colors text-xs ${!isVisible ? 'opacity-40' : ''}`}
                          title={isVisible ? "Hide section markers" : "Show section markers"}
                        >
                          {isVisible ? '👁️' : '🚫'}
                        </button>

                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                        
                        <span className="truncate font-bold text-[var(--foreground)]">{title}</span>

                        {groupData.type && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-bg)] px-1.5 py-0.5 rounded border border-[var(--surface-border)] shrink-0" title={`Category: ${groupData.type}`}>
                            {groupData.type}
                          </span>
                        )}
                      </div>

                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-muted)] transition-transform duration-200 group-open/details:rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>

                    {/* Items */}
                    <div className="divide-y divide-[var(--surface-border)]/40 bg-[var(--surface-bg)]">
                      {groupData.items.map((item, iIdx) => {
                        let badgeBg = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
                        let badgeIcon = '';

                        if (range > 0) {
                          if (item.duration <= tier1) {
                            badgeBg = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
                          } else if (item.duration <= tier2) {
                            badgeBg = 'bg-amber-500/15 text-amber-500 border-amber-500/30';
                          } else {
                            badgeBg = 'bg-red-500/15 text-red-500 border-red-500/30';
                            badgeIcon = '⚠️ ';
                          }
                        }

                        return (
                          <div 
                            key={iIdx}
                            onClick={() => seekToTime(item.start)}
                            className={`p-2.5 px-3 flex items-center justify-between text-xs font-mono cursor-pointer transition-all hover:bg-[var(--background)] border-l-4 ${isVisible ? '' : 'opacity-40'}`}
                            style={{ borderLeftColor: isVisible ? color : 'transparent' }}
                          >
                            <span className="text-[var(--foreground)] font-bold">{item.originalStr}</span>

                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${badgeBg}`}>
                              {badgeIcon}{item.duration}s
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Manage Markers Sub-Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-modal-pop">
          <div className="relative surface border border-[var(--surface-border)] rounded-2xl w-full max-w-lg shadow-2xl bg-[var(--surface-bg)] overflow-hidden">
            <div className="py-3 px-5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--background)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Import / Edit Marker Text</h3>
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--foreground)] p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Paste formatted timestamps and section headers (e.g. <code className="text-[var(--accent)]">[Section]</code>, <code className="text-[var(--accent)]">0:05 - 0:45</code>).
              </p>
              <textarea 
                value={markerText}
                onChange={(e) => setMarkerText(e.target.value)}
                className="w-full h-64 p-3 bg-[var(--background)] border border-[var(--surface-border)] rounded-xl text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="Paste formatted list here..."
              />
            </div>
            <div className="p-3 px-5 border-t border-[var(--surface-border)] bg-[var(--background)] flex justify-end gap-2">
              <button 
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  parseMarkerText(markerText);
                  setIsManageModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#0b0f1a] text-xs font-bold hover:brightness-110"
              >
                Load & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
