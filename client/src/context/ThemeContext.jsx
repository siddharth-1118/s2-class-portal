import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
    const [accentColor, setAccentColor] = useState(localStorage.getItem('app-accent') || 'violet');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'color-blind');
        root.classList.add(theme);
        localStorage.setItem('app-theme', theme);

        // Handle Accent Color (If Custom Hex or Predefined)
        const colorMap = {
            'violet': '124, 58, 237',
            'indigo': '79, 70, 229',
            'blue': '37, 99, 235',
            'emerald': '5, 150, 105',
            'orange': '234, 88, 12',
            'pink': '219, 39, 119',
            'red': '220, 38, 38',
            'cyan': '8, 145, 178'
        };

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
        };

        const rgb = colorMap[accentColor] || hexToRgb(accentColor) || '124, 58, 237';
        root.style.setProperty('--accent-color', rgb);

        localStorage.setItem('app-accent', accentColor);
    }, [theme, accentColor]);

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
