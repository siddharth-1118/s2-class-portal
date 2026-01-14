import React from 'react';
import { useTheme } from '../context/ThemeContext';

const VFXLayer = () => {
    const { theme } = useTheme();

    if (theme === 'space') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="stars-sm"></div>
                <div className="stars-md"></div>
                <div className="stars-lg"></div>
            </div>
        );
    }

    if (theme === 'winter') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="snowflake" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() }}>❅</div>
                ))}
            </div>
        );
    }

    if (theme === 'cyberpunk') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="cyber-grid"></div>
                <div className="scanline"></div>
            </div>
        );
    }

    if (theme === 'ocean') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="bubble" style={{ left: `${Math.random() * 100}%`, width: `${10 + Math.random() * 40}px`, animationDelay: `${Math.random() * 5}s` }}></div>
                ))}
            </div>
        );
    }

    // --- NEW VFX IMPLEMENTATIONS ---

    if (theme === 'fantasy' || theme === 'magic') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="sparkle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }}>✨</div>
                ))}
            </div>
        );
    }

    if (theme === 'jungle' || theme === 'alien' || theme === 'dino') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(25)].map((_, i) => (
                    <div key={i} className="firefly" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s` }}></div>
                ))}
                {theme === 'dino' && <div className="ash-overlay"></div>}
            </div>
        );
    }

    if (theme === 'candy' || theme === 'sports') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="floating-item" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s` }}>
                        {theme === 'candy' ? '🍭' : '⚽'}
                    </div>
                ))}
            </div>
        );
    }

    if (theme === 'samurai' || theme === 'western') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="petal" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 8}s`, backgroundColor: theme === 'samurai' ? '#ffc0cb' : '#e3d2b4' }}></div>
                ))}
            </div>
        );
    }

    if (theme === 'pixel' || theme === 'robot') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="matrix-rain">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="matrix-col" style={{ left: `${i * 10}%`, animationDelay: `${Math.random() * 2}s` }}>01010</div>
                    ))}
                </div>
            </div>
        );
    }

    if (theme === 'steampunk' || theme === 'horror') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="fog-layer"></div>
                {theme === 'horror' && <div className="red-eyes"></div>}
            </div>
        );
    }

    if (theme === 'superhero') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="comic-lines"></div>
            </div>
        );
    }

    if (theme === 'music') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="floating-note" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s` }}>
                        {['♪', '♫', '♩', '♬'][Math.floor(Math.random() * 4)]}
                    </div>
                ))}
            </div>
        );
    }

    if (theme === 'pirate') {
        return (
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="rain-layer"></div>
            </div>
        );
    }

    // Default: subtle noise or gradient overlay
    return <div className="fixed inset-0 pointer-events-none z-0"></div>;
};

export default VFXLayer;
