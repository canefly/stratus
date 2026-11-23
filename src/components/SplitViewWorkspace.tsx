import React, { useState, useEffect, useRef } from 'react';
import { RawViewer } from './RawViewer';
import { ResultsPane } from './ResultsPane';
import { DocumentTabs } from './DocumentTabs';
import { useParserStore } from '../store/useParserStore';

export const SplitViewWorkspace: React.FC = () => {
  const isTimelineHidden = useParserStore(state => state.isTimelineHidden);
  const isDocTabsOpen = useParserStore(state => state.isDocTabsOpen);
  const [isResizing, setIsResizing] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current || !leftPaneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      let newLeftWidth = (relativeX / rect.width) * 100;

      if (newLeftWidth < 20) newLeftWidth = 20;
      if (newLeftWidth > 85) newLeftWidth = 85;

      leftPaneRef.current.style.width = `${newLeftWidth}%`;
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        if (leftPaneRef.current) {
          const w = parseFloat(leftPaneRef.current.style.width);
          if (!isNaN(w)) {
            setLeftWidth(w);
          }
        }
      }
    };

    if (isResizing) {
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.classList.remove('resizing');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);

  return (
    <div id="split-view" ref={containerRef} className="w-full h-full flex transition-opacity duration-500 opacity-100 gap-1 rounded-2xl">
      <div
        id="left-pane"
        ref={leftPaneRef}
        className="h-full flex flex-row bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl overflow-hidden shadow-2xl shadow-black/10 relative"
        style={{ width: isTimelineHidden ? '100%' : `${leftWidth}%`, minWidth: isTimelineHidden ? '100%' : '200px' }}
      >
        {isDocTabsOpen && <DocumentTabs />}
        <div className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
          <RawViewer />
        </div>
      </div>

      {!isTimelineHidden && (
        <div
          id="resizer"
          className={isResizing ? 'resizing' : ''}
          onMouseDown={() => setIsResizing(true)}
        ></div>
      )}

      {!isTimelineHidden && (
        <div id="right-pane" className="flex-1 h-full flex flex-col bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl overflow-hidden min-w-[285px] shadow-2xl shadow-black/10">
          <ResultsPane />
        </div>
      )}
    </div>
  );
};
