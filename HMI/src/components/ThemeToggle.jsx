import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-track">
        <Sun className="theme-icon sun-icon" size={12} />
        <Moon className="theme-icon moon-icon" size={12} />
        <div className={`theme-toggle-thumb ${theme}`} />
      </div>
    </button>
  );
}
