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
        // Expanded theme list cleanup
        const themes = [
            'light', 'dark', 'cyberpunk', 'fantasy', 'space', 'ocean', 'jungle', 'candy', 'steampunk', 'horror',
            'pixel', 'samurai', 'superhero', 'magic', 'western', 'music', 'sports', 'winter', 'dino', 'robot', 'pirate', 'alien',
            'sunset', 'midnight', 'forest', 'retro'
        ];
        root.classList.remove(...themes);
        root.classList.add(theme);
        localStorage.setItem('app-theme', theme);
        if (character) localStorage.setItem('app-character', JSON.stringify(character));

        // Handle Accent Color (If Custom Hex or Predefined)
        const colorMap = {
            'violet': '124, 58, 237',
            'neon': '57, 255, 20', // Cyberpunk
            'gold': '255, 215, 0', // Fantasy, Pirate
            'starlight': '147, 197, 253', // Space
            'teal': '20, 184, 166', // Ocean
            'leaf': '74, 222, 128', // Jungle, Alien
            'pink': '236, 72, 153', // Candy
            'bronze': '212, 163, 115', // Steampunk, Western
            'blood': '239, 68, 68', // Horror
            '8bit': '59, 130, 246', // Pixel, Winter
            'crimson': '220, 38, 38', // Samurai
            'hero': '250, 204, 21', // Superhero
            'magic-purple': '192, 132, 252', // Magic
            'music-pink': '233, 69, 96', // Music
            'grass': '34, 197, 94', // Sports
            'swamp': '101, 163, 13', // Dino
            'electric': '56, 189, 248', // Robot
            'orange': '249, 115, 22', // Sunset
            'indigo': '99, 102, 241', // Midnight
            'green': '34, 197, 94', // Forest
            'yellow': '234, 179, 8' // Retro
        };

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        const rgb = colorMap[accentColor] || hexToRgb(accentColor) || '124, 58, 237';
        root.style.setProperty('--accent-color', rgb);

        // Handle Font
        const fontClasses = [
            'font-sans', 'font-serif', 'font-mono', 'font-inter', 'font-roboto', 'font-open-sans', 'font-lato', 'font-montserrat',
            'font-oswald', 'font-raleway', 'font-poppins', 'font-nunito', 'font-ubuntu', 'font-merriweather', 'font-playfair',
            'font-lora', 'font-roboto-slab', 'font-arvo', 'font-pacifico', 'font-dancing', 'font-indie', 'font-amatic',
            'font-shadows', 'font-orbitron', 'font-press-start', 'font-creepster', 'font-cinzel', 'font-bangers', 'font-righteous', 'font-fredericka'
        ];
        root.classList.remove(...fontClasses);
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
