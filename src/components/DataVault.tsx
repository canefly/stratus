import React, { useEffect, useState } from 'react';
import { useParserStore } from '../store/useParserStore';
import { getDeletedDocuments, restoreDocumentState, getActiveDocuments, softDeleteDocumentState } from '../lib/db';

export const DataVault: React.FC = () => {
  const isDataVaultOpen = useParserStore(state => state.isDataVaultOpen);
  const setDataVaultOpen = useParserStore(state => state.setDataVaultOpen);
  const stats = useParserStore(state => state.stats);
  const resetStats = useParserStore(state => state.resetStats);

  const [activeTab, setActiveTab] = useState<'stats' | 'active' | 'recycle'>('stats');
  const [activeDocs, setActiveDocs] = useState<any[]>([]);
  const [deletedDocs, setDeletedDocs] = useState<any[]>([]);

  useEffect(() => {
    if (isDataVaultOpen && activeTab === 'recycle') {
      getDeletedDocuments().then(setDeletedDocs);
    }
    if (isDataVaultOpen && activeTab === 'active') {
      getActiveDocuments().then(setActiveDocs);
    }
  }, [isDataVaultOpen, activeTab]);

  if (!isDataVaultOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-10 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="text-xl font-bold font-mono tracking-tight text-[var(--foreground)]">Data Vault</h2>
          </div>
          <button 
            onClick={() => setDataVaultOpen(false)}
            className="p-2 hover:bg-[var(--surface-border)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-[var(--surface-border)] bg-black/20 flex flex-col p-4 gap-2">
            {[
              { id: 'stats', label: 'Metrics & Stats' },
              { id: 'active', label: 'Active Scripts' },
              { id: 'recycle', label: 'Recycle Bin' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-left px-4 py-2.5 rounded-lg font-mono text-xs tracking-wider transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[var(--accent)] text-black font-bold shadow-lg' 
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-border)] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">Gamification Metrics</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6">These are your lifetime stats tracked by the system.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--surface-border)]/30 border border-[var(--surface-border)] rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-mono mb-1">Lifetime Parse Time</div>
                    <div className="text-3xl font-bold text-[var(--accent)]">
                      {Math.floor(stats.lifetimeSeconds / 3600)}h {Math.floor((stats.lifetimeSeconds % 3600) / 60)}m
                    </div>
                  </div>
                  
                  <div className="bg-[var(--surface-border)]/30 border border-[var(--surface-border)] rounded-xl p-4">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-mono mb-1">Total A-Roll Cuts</div>
                    <div className="text-3xl font-bold text-[var(--foreground)]">
                      {stats.totalARollCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Reset Statistics</span>
                    <span className="text-xs text-[var(--text-muted)] italic">Permanently reset your lifetime parse time, clips logged, and footage processed.</span>
                  </div>
                  <button
                    onClick={async () => {
                      const { ask } = await import('@tauri-apps/plugin-dialog');
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
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Reset Stats
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'active' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span>📁</span> Active Scripts
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6">Manage your active checklist memories. Deleting them will send them to the recycle bin.</p>
                </div>
                
                {activeDocs.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)] border border-dashed border-[var(--surface-border)] rounded-lg">
                    No active scripts found in the database.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDocs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-lg hover:border-[var(--accent)] transition-all group">
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-sm text-[var(--foreground)] truncate" title={doc.doc_hash}>
                            {doc.doc_hash.replace('cp_prog_', '').split(/[\\/\\]/).pop()}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] mt-1 truncate">{doc.doc_hash.replace('cp_prog_', '')}</span>
                        </div>
                        <button
                          onClick={async () => {
                            await softDeleteDocumentState(doc.doc_hash);
                            getActiveDocuments().then(setActiveDocs);
                          }}
                          className="px-3 py-1.5 ml-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold rounded transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recycle' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    Recycle Bin
                    <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">{deletedDocs.length}</span>
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm mb-6">Deleted checklist memories stay here for 30 days before being permanently purged from the SQLite database.</p>
                </div>

                {deletedDocs.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[var(--surface-border)] rounded-xl">
                    <p className="text-[var(--text-muted)]">Recycle Bin is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deletedDocs.map(doc => (
                      <div key={doc.docHash} className="flex items-center justify-between p-4 bg-[var(--surface-border)]/30 border border-[var(--surface-border)] rounded-xl hover:border-[var(--accent)]/50 transition-colors">
                        <div>
                          <div className="text-xs font-mono text-[var(--text-muted)] break-all mb-1">ID: {doc.docHash}</div>
                          <div className="text-sm">Deleted on: {new Date(doc.deletedAt).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={async () => {
                            await restoreDocumentState(doc.docHash);
                            getDeletedDocuments().then(setDeletedDocs);
                          }}
                          className="px-4 py-2 bg-[var(--accent)] text-black font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                        >
                          Restore Memory
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

