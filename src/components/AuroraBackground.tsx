import React from 'react';
import { useParserStore } from '../store/useParserStore';

export const AuroraBackground: React.FC = () => {
    const { performanceMode, auroraSize, auroraOpacity } = useParserStore();

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-[var(--background)] pointer-events-none transition-colors duration-500">
            {!performanceMode && (
                <div 
                    className="absolute inset-0 origin-center transition-transform duration-300 pointer-events-none"
                    style={{ transform: `scale(${auroraSize})` }}
                >
                    <div 
                        className="absolute w-[40rem] h-[40rem] rounded-full bg-[var(--aurora-1)] filter blur-[120px] animate-aurora-1 left-[-10%] top-[-10%] transition-colors duration-1000 mix-blend-screen dark:mix-blend-lighten"
                        style={{ opacity: auroraOpacity }}
                    ></div>
                    <div 
                        className="absolute w-[50rem] h-[50rem] rounded-full bg-[var(--aurora-2)] filter blur-[120px] animate-aurora-2 right-[-20%] bottom-[-20%] transition-colors duration-1000 mix-blend-screen dark:mix-blend-lighten"
                        style={{ opacity: auroraOpacity }}
                    ></div>
                    <div 
                        className="absolute w-[35rem] h-[35rem] rounded-full bg-[var(--aurora-3)] filter blur-[120px] animate-aurora-3 left-[30%] bottom-[-10%] transition-colors duration-1000 mix-blend-screen dark:mix-blend-lighten"
                        style={{ opacity: auroraOpacity }}
                    ></div>
                </div>
            )}
        </div>
    );
};
