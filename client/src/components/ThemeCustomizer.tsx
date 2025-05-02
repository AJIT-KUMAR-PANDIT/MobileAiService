import React from 'react';
import { useTheme, accentColorOptions, ThemeMode, AccentColor } from '@/contexts/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';

export const ThemeCustomizer: React.FC = () => {
  const { mode, accentColor, setMode, setAccentColor } = useTheme();

  return (
    <div className="p-4 border-t border-gray-700">
      <h3 className="text-xs text-gray-400 mb-3">Appearance</h3>
      
      {/* Theme mode selector */}
      <div className="mb-4">
        <div className="text-xs font-medium mb-2">Theme</div>
        <div className="grid grid-cols-3 gap-2">
          <ThemeModeButton 
            mode="light" 
            currentMode={mode} 
            onClick={() => setMode('light')}
            icon={<Sun size={14} />}
            label="Light"
          />
          <ThemeModeButton 
            mode="dark" 
            currentMode={mode} 
            onClick={() => setMode('dark')}
            icon={<Moon size={14} />}
            label="Dark"
          />
          <ThemeModeButton 
            mode="system" 
            currentMode={mode} 
            onClick={() => setMode('system')}
            icon={<Monitor size={14} />}
            label="System"
          />
        </div>
      </div>
      
      {/* Accent color selector */}
      <div>
        <div className="text-xs font-medium mb-2">Accent Color</div>
        <div className="grid grid-cols-5 gap-2">
          {accentColorOptions.map(option => (
            <ColorButton
              key={option.value}
              color={option.value}
              currentColor={accentColor}
              onClick={() => setAccentColor(option.value)}
              label={option.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Theme mode button component
interface ThemeModeButtonProps {
  mode: ThemeMode;
  currentMode: ThemeMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ThemeModeButton: React.FC<ThemeModeButtonProps> = ({ 
  mode, 
  currentMode, 
  onClick, 
  icon,
  label 
}) => {
  const isSelected = mode === currentMode;
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors ${
        isSelected
          ? "bg-primary bg-opacity-20 border border-primary"
          : "bg-gray-800 border border-gray-700 hover:border-gray-600"
      }`}
    >
      <span className="mb-1">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  );
};

// Color button component
interface ColorButtonProps {
  color: AccentColor;
  currentColor: AccentColor;
  onClick: () => void;
  label: string;
}

const ColorButton: React.FC<ColorButtonProps> = ({ 
  color, 
  currentColor, 
  onClick,
  label
}) => {
  const isSelected = color === currentColor;
  
  // Map colors to tailwind classes
  const colorClasses: Record<AccentColor, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };
  
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center justify-center p-1 rounded-full transition-colors ${
        isSelected ? "ring-2 ring-white" : ""
      }`}
    >
      <span className={`block w-6 h-6 rounded-full ${colorClasses[color]}`}></span>
    </button>
  );
};