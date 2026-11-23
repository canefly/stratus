import React, { useState, useEffect, useRef } from 'react';
import { useParserStore } from '../store/useParserStore';

interface ContextMenuProps {
  x: number;
  y: number;
  blockId: number;
  selectedText: string;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, blockId, selectedText, onClose }) => {
  const addCustomNote = useParserStore(state => state.addCustomNote);
  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAddToNote = () => {
    addCustomNote({
      id: crypto.randomUUID(),
      blockId,
      selectedText,
      timestamp: Date.now()
    });
    onClose();
  };

  const handleSaveComment = () => {
    addCustomNote({
      id: crypto.randomUUID(),
      blockId,
      selectedText,
      comment: comment.trim() || undefined,
      timestamp: Date.now()
    });
    onClose();
  };
  
  // ensure menu stays inside viewport
  const safeX = Math.min(x, window.innerWidth - 300);
  const safeY = Math.min(y, window.innerHeight - 200);

  return (
    <div 
      ref={menuRef}
      className="fixed bg-[#18181b] border border-[#27272a] shadow-2xl rounded-xl overflow-hidden p-1 min-w-[200px] z-[100] animate-modal-pop flex flex-col"
      style={{ top: safeY, left: safeX }}
    >
      {!isCommenting ? (
        <div className="flex flex-col gap-0.5">
          <button 
            onClick={handleAddToNote}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-[#27272a] hover:text-white rounded-md transition-colors text-left cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Add to Editor's Note
          </button>
          <button 
            onClick={() => setIsCommenting(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-[#27272a] hover:text-white rounded-md transition-colors text-left cursor-pointer"
            title="This comment will be added on editor's notes as well."
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Add a Comment
          </button>
        </div>
      ) : (
        <div className="p-2 flex flex-col gap-2">
          <textarea 
            autoFocus
            className="w-full h-20 bg-[#09090b] border border-[#27272a] rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
            placeholder="Type your comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveComment(); }
            }}
          />
          <div className="flex gap-2 justify-end mt-1">
             <button onClick={() => setIsCommenting(false)} className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#27272a] rounded-md transition-colors">Cancel</button>
             <button onClick={handleSaveComment} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md text-xs font-bold rounded-md transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  );
};
