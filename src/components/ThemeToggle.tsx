import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/src/hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo oscuro activo (click para modo claro)' : 'Modo claro activo (click para modo oscuro)'}
      className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-xs font-bold cursor-pointer"
    >
      {isDark ? (
        <Moon className="w-4 h-4 text-indigo-400" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500" />
      )}
      <span className="hidden sm:inline">{isDark ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
