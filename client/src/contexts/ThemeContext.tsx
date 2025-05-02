import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  toggleMode: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  accentColor: 'blue',
  setMode: () => {},
  setAccentColor: () => {},
  toggleMode: () => {}
});

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
}

// CSS variables for accent colors
const accentColorVariables: Record<AccentColor, Record<string, string>> = {
  blue: {
    '--primary': 'hsl(214, 80%, 56%)',
    '--primary-foreground': 'hsl(0, 0%, 98%)',
    '--primary-hover': 'hsl(214, 80%, 50%)',
    '--primary-muted': 'hsla(214, 80%, 56%, 0.2)'
  },
  purple: {
    '--primary': 'hsl(262, 80%, 56%)',
    '--primary-foreground': 'hsl(0, 0%, 98%)',
    '--primary-hover': 'hsl(262, 80%, 50%)',
    '--primary-muted': 'hsla(262, 80%, 56%, 0.2)'
  },
  green: {
    '--primary': 'hsl(142, 70%, 45%)',
    '--primary-foreground': 'hsl(0, 0%, 98%)',
    '--primary-hover': 'hsl(142, 70%, 40%)',
    '--primary-muted': 'hsla(142, 70%, 45%, 0.2)'
  },
  orange: {
    '--primary': 'hsl(32, 95%, 55%)',
    '--primary-foreground': 'hsl(0, 0%, 98%)',
    '--primary-hover': 'hsl(32, 95%, 50%)',
    '--primary-muted': 'hsla(32, 95%, 55%, 0.2)'
  },
  red: {
    '--primary': 'hsl(0, 70%, 55%)',
    '--primary-foreground': 'hsl(0, 0%, 98%)',
    '--primary-hover': 'hsl(0, 70%, 50%)',
    '--primary-muted': 'hsla(0, 70%, 55%, 0.2)'
  }
};

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get initial theme from localStorage or use default
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem('luna-theme-mode');
    return (savedMode as ThemeMode) || 'dark';
  });
  
  // Get initial accent color from localStorage or use default
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const savedColor = localStorage.getItem('luna-accent-color');
    return (savedColor as AccentColor) || 'blue';
  });

  // Apply theme mode (light/dark) to document
  useEffect(() => {
    const root = window.document.documentElement;
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Store in localStorage
    localStorage.setItem('luna-theme-mode', mode);
    
    if (mode === 'system') {
      if (systemDarkMode) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    } else {
      root.classList.add(mode);
      root.classList.remove(mode === 'dark' ? 'light' : 'dark');
    }
  }, [mode]);

  // Apply accent color variables
  useEffect(() => {
    // Store in localStorage
    localStorage.setItem('luna-accent-color', accentColor);
    
    // Apply CSS variables
    const variables = accentColorVariables[accentColor];
    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [accentColor]);

  // Toggle between light/dark modes
  const toggleMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Context provider value
  const value = {
    mode,
    accentColor,
    setMode,
    setAccentColor,
    toggleMode
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Accent color options for UI
export const accentColorOptions: { value: AccentColor; label: string }[] = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' }
];