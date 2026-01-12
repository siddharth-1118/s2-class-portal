import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
    const [accentColor, setAccentColor] = useState(localStorage.getItem('app-accent') || 'violet');
    const [font, setFont] = useState(localStorage.getItem('app-font') || 'sans');
    const [bgPattern, setBgPattern] = useState(localStorage.getItem('app-bg') || 'mesh-gradient');
    const [character, setCharacter] = useState(() => {
        const saved = localStorage.getItem('app-character');
        try { return saved ? JSON.parse(saved) : null; } catch { return null; }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'cyberpunk', 'fantasy', 'space', 'ocean', 'jungle', 'candy', 'steampunk', 'horror', 'pixel', 'samurai', 'superhero', 'magic');
        root.classList.add(theme);
        localStorage.setItem('app-theme', theme);
        if (character) localStorage.setItem('app-character', JSON.stringify(character));

        // Handle Accent Color (If Custom Hex or Predefined)
        const colorMap = {
            'violet': '124, 58, 237',
            'neon': '57, 255, 20', // Cyberpunk
            'gold': '255, 215, 0', // Fantasy
            'starlight': '147, 197, 253', // Space
            'teal': '20, 184, 166', // Ocean
            'leaf': '74, 222, 128', // Jungle
            'pink': '236, 72, 153', // Candy
            'bronze': '212, 163, 115', // Steampunk
            'blood': '239, 68, 68', // Horror
            '8bit': '59, 130, 246', // Pixel
            'crimson': '220, 38, 38', // Samurai
            'hero': '250, 204, 21', // Superhero
            'magic-purple': '192, 132, 252' // Magic
        };

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        const rgb = colorMap[accentColor] || hexToRgb(accentColor) || '124, 58, 237';
        root.style.setProperty('--accent-color', rgb);

        // Handle Font
        root.classList.remove('font-sans', 'font-serif', 'font-mono');
        root.classList.add(`font-${font}`);
        localStorage.setItem('app-font', font);

        localStorage.setItem('app-bg', bgPattern);

    }, [theme, accentColor, font, bgPattern, character]);

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor, font, setFont, bgPattern, setBgPattern, character, setCharacter }}>
            {children}
        </ThemeContext.Provider>
    );
};
