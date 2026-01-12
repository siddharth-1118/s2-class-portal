import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
    const [accentColor, setAccentColor] = useState(localStorage.getItem('app-accent') || 'violet');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('app-theme', theme);

        // Dynamic Accent Colors could be handled here by setting CSS variables
        // For now, we'll store it for components to use conditionally if needed
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
