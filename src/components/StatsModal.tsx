import React from 'react';
import { useParserStore } from '../store/useParserStore';

export const StatsModal: React.FC = () => {
    const { 
        isStatsModalOpen, setStatsModalOpen, stats, sessionSeconds, resetStats 
    } = useParserStore();

    if (!isStatsModalOpen) return null;

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

    const StatRow = ({ label, value, icon, colorClass }: { label: string, value: string | number, icon: React.ReactNode, colorClass: string }) => (
        <div className="flex justify-between items-center bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-xl py-2.5 px-3 transition-all hover:bg-[var(--background)] group shadow-sm">
           <div className="flex items-center gap-2.5">
             <div className={`h-7 w-7 rounded-full ${colorClass} flex items-center justify-center border border-[var(--surface-border)] shrink-0`}>
                {icon}
             </div>
             <span className="text-[9px] tracking-widest text-[var(--text-muted)] uppercase font-bold group-hover:text-[var(--foreground)] transition-colors">{label}</span>
           </div>
           <span className="text-base font-bold text-[var(--foreground)] font-mono tracking-tight">{value}</span>
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center`}>
            {/* Overlay */}
            <div 
                className="absolute inset-0 modal-overlay cursor-pointer" 
                onClick={() => setStatsModalOpen(false)}
            ></div>

            {/* Modal Body */}
            <div className={`relative surface border-[var(--surface-border)] rounded-2xl w-full max-w-[300px] max-h-[85vh] flex flex-col shadow-2xl bg-[var(--surface-bg)] overflow-hidden animate-modal-pop`}>
                {/* Header */}
                <div className="py-2.5 px-4 border-b border-[var(--surface-border)] flex justify-between items-center bg-[var(--background)]">
                    <div className="flex items-center gap-2.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h2 className="text-sm font-bold text-[var(--foreground)]">Stats</h2>
                    </div>
                    <button 
                        onClick={() => setStatsModalOpen(false)} 
                        className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content - Vertical List */}
                <div className="p-3 space-y-2.5 bg-[var(--background)]">
                    <StatRow 
                        label="Current Session" 
                        value={formatHumanTime(sessionSeconds)} 
                        colorClass="bg-cyan-500/10 text-cyan-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatRow 
                        label="Lifetime Uptime" 
                        value={formatHumanTime(stats.lifetimeSeconds)} 
                        colorClass="bg-blue-500/10 text-blue-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    />
                    <StatRow 
                        label="Clips Logged" 
                        value={stats.totalARollCount} 
                        colorClass="bg-emerald-500/10 text-emerald-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                    />
                    <StatRow 
                        label="Footage Processed" 
                        value={formatHumanTime(stats.totalDurationLogged)} 
                        colorClass="bg-purple-500/10 text-purple-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>}
                    />
                </div>

                {/* Footer */}
                <div className="bg-[var(--surface-bg)] border-t border-[var(--surface-border)] py-2.5 px-3 flex justify-between items-center">
                    <span className="text-[10px] text-[var(--text-muted)] italic tracking-wide">
                        Last Active: {stats.lastUsedDate}
                    </span>
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
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};
