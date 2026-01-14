import { useState, useEffect } from 'react';
import api from '../utils/api';
import { EventTheme } from '../types';

interface ThemeSelectorProps {
  selectedThemeId?: number;
  onSelectTheme: (theme: EventTheme | null) => void;
}

const ThemeSelector = ({ selectedThemeId, onSelectTheme }: ThemeSelectorProps) => {
  const [themes, setThemes] = useState<EventTheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      // For now, only fetch free themes
      const response = await api.get('/event-themes/free');
      setThemes(response.data);
    } catch (error) {
      console.error('Failed to load themes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-gray-600">Loading themes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Choose a Theme (Optional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Themes customize the colors and style of your event page.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Default Theme Option */}
        <button
          type="button"
          onClick={() => onSelectTheme(null)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            !selectedThemeId
              ? 'border-rose-500 bg-rose-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="h-12 rounded-lg mb-2 bg-gradient-to-r from-rose-500 to-pink-500"></div>
          <div className="font-semibold text-xs">Default</div>
          <div className="text-xs text-gray-600 mt-0.5">Rose & Pink</div>
        </button>

        {/* Theme Options */}
        {themes.map(theme => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelectTheme(theme)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedThemeId === theme.id
                ? 'border-rose-500 bg-rose-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div
              className="h-12 rounded-lg mb-2"
              style={{
                background: theme.background_gradient_start && theme.background_gradient_end
                  ? `linear-gradient(to right, ${theme.background_gradient_start}, ${theme.background_gradient_end})`
                  : theme.primary_color
              }}
            ></div>
            <div className="font-semibold text-xs">{theme.display_name}</div>
            {theme.description && (
              <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">{theme.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
