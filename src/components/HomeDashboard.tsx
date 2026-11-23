import React, { useMemo, useState } from 'react';
import { useParserStore } from '../store/useParserStore';
import { open } from '@tauri-apps/plugin-dialog';
import { TypeAnimation } from 'react-type-animation';

const typosPool = ['WMLCOME', 'WLCOME', 'WELCOMP', 'WLEMCOM', 'WELACOME', 'WELCOMRE', 'WELCO0ME', 'WLEICME', 'WLCOM\\', 'WLECOME'];
const multilingualHellos = [
  'Hello', 'Hola', 'Bonjour', 'こんにちは', 'Ciao', '안녕하세요', 
  'Hallo', 'Olá', 'Привет', '你好', 'مرحباً', 'नमस्ते'
];

export const HomeDashboard: React.FC = () => {
    const { recentFiles, parseFile, setSettingsModalOpen, setCopyrightOpen } = useParserStore();
    const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);

    const sequence = useMemo(() => {
        const isAppleStyle = Math.random() < 0.3; // 30% chance for the multilingual sequence

        if (isAppleStyle) {
            const shuffledHellos = [...multilingualHellos].sort(() => 0.5 - Math.random());
            const helloSequence: (string | number)[] = [];
            
            shuffledHellos.forEach(hello => {
                helloSequence.push(hello, 1000); // Show each language for 1s
            });
            
            helloSequence.push('WELCOME!! ... HI!', 3000);
            return helloSequence;
        }

        const shuffled = [...typosPool].sort(() => 0.5 - Math.random());
        return [
            shuffled[0], 800,
            shuffled[1], 800,
            'WELCOME!! ... HI!', 3000
        ];
    }, []);

    const getRelativeTime = (isoString: string) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'yesterday';
        return `${days}d ago`;
    };

    const handleOpenDialog = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'Word Document', extensions: ['docx'] }]
            });
            if (selected && typeof selected === 'string') {
                parseFile(selected);
            } else if (selected && Array.isArray(selected) && selected.length > 0) {
                parseFile(selected[0]);
            }
        } catch (e) {
            console.error("Dialog error", e);
        }
    };

    return (
        <>
        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto gap-10 p-10 overflow-y-auto">
            {/* Header Section */}
            <div className="flex items-start justify-between w-full gap-4">
                <div className="space-y-4 flex-1">
                    <div className="h-[60px] flex items-end">
                        <TypeAnimation
                            sequence={sequence}
                            wrapper="h1"
                            speed={50}
                            deletionSpeed={65}
                            className="welcome-heading text-5xl font-bold tracking-tight leading-none"
                            style={{ color: 'var(--foreground)' }}
                            repeat={Infinity}
                            cursor={true}
                        />
                    </div>
                </div>

                {/* Main Center Small Settings Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2">
                    <button 
                        onClick={() => setSettingsModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl surface border border-[var(--surface-border)] hover:border-[var(--accent)] text-[var(--foreground)] hover:text-[var(--accent)] transition-all shadow-sm active:scale-95 flex items-center gap-2 text-xs font-bold bg-[var(--surface-bg)] group cursor-pointer"
                        title="Application Settings & General Stats"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--accent)] group-hover:rotate-45 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            {/* Split Section: New File vs Recent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left: Script Parser */}
                <div 
                    onClick={handleOpenDialog}
                    className="surface rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-[var(--accent)]/50 shadow-2xl h-[300px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="z-10 flex flex-col items-center gap-6">
                        <div className="h-16 w-16 bg-[var(--accent)]/20 text-[var(--accent)] rounded-2xl flex items-center justify-center shadow-inner border border-[var(--accent)]/30 group-hover:scale-110 transition-transform duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-[var(--foreground)] tracking-wide">Script Parser</h3>
                            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Extract A-Rolls & Durations</p>
                        </div>
                    </div>
                </div>

                {/* Right: Recent Files */}
                <div className="surface rounded-3xl p-6 flex flex-col border border-[var(--surface-border)] overflow-hidden shadow-xl h-[300px]">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Recent Scripts</h3>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {recentFiles.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic animate-pulse opacity-60">No recent scripts</span>
                            </div>
                        ) : (
                            recentFiles.map((file, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => parseFile(file.path)}
                                    className="flex justify-between items-center bg-[var(--background)] border border-[var(--surface-border)]/50 hover:bg-[var(--surface-bg)] hover:border-[var(--accent)]/30 rounded-xl p-3.5 transition-all cursor-pointer group active:scale-[0.98]"
                                >
                                    <div className="flex flex-col gap-0.5 max-w-[75%]">
                                        <span className="text-sm font-bold text-[var(--foreground)] truncate transition-colors capitalize opacity-80 group-hover:opacity-100">{file.name}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest bg-[var(--accent)]/10 px-2 py-1 rounded-md shrink-0">
                                        {getRelativeTime(file.date)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Active Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">

                {/* Check for Updates Card */}
                <div
                    onClick={() => setIsUpdatesOpen(true)}
                    className="surface p-6 rounded-2xl flex items-center justify-between cursor-pointer group border border-[var(--surface-border)] hover:border-[var(--accent)] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[var(--accent)]/15 rounded-lg flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/30 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--foreground)] tracking-wide group-hover:text-[var(--accent)] transition-colors">About Stratus</h4>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black">Version &amp; Open Source Info</p>
                        </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>

                {/* Copyright Helper Button */}
                <div 
                    onClick={() => setCopyrightOpen(true)}
                    className="surface p-6 rounded-2xl flex items-center justify-between cursor-pointer group border border-[var(--surface-border)] hover:border-[var(--accent)] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[var(--accent)]/15 rounded-lg flex items-center justify-center text-[var(--accent)] border border-[var(--accent)]/30 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-[var(--foreground)] tracking-wide group-hover:text-[var(--accent)] transition-colors">Copyright Helper</h4>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded">DISCONTINUED</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black">Unoptimized · Loads Video Into RAM</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* About / Updates Modal */}
        {isUpdatesOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center">
                <div className="absolute inset-0 modal-overlay" onClick={() => setIsUpdatesOpen(false)}></div>
                <div className="relative surface border border-[var(--surface-border)] rounded-2xl w-full max-w-md shadow-2xl bg-[var(--surface-bg)] overflow-hidden animate-modal-pop flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="py-3 px-5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--background)] shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-sm font-bold text-[var(--foreground)] tracking-wide">About Stratus</h2>
                        </div>
                        <button onClick={() => setIsUpdatesOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-1.5 rounded-lg hover:bg-[var(--background)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[var(--background)]">
                        {/* Open Source License */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Open Source</p>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                <strong className="text-[var(--foreground)]">Stratus</strong> is open-source software created by <strong className="text-[var(--foreground)]">canefly</strong>. Contributions, issues, and forks are welcome on GitHub.
                            </p>
                            <a
                                href="https://github.com/canefly/stratus"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                            >
                                github.com/canefly/stratus
                            </a>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--surface-border)] bg-[var(--surface-bg)] shrink-0 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">Stratus v1.2.1 · Open Source</span>
                        <button
                            onClick={() => setIsUpdatesOpen(false)}
                            className="px-4 py-2 bg-[var(--accent)] hover:bg-cyan-500 text-[#0b0f1a] text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
