import { useState, useEffect } from 'react';
import api from '../utils/api';
import { EventTemplate } from '../types';

interface TemplateSelectorProps {
  eventType: string;
  selectedTemplateId?: number;
  onSelectTemplate: (template: EventTemplate | null) => void;
}

const TemplateSelector = ({ eventType, selectedTemplateId, onSelectTemplate }: TemplateSelectorProps) => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [eventType]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/event-templates/by-type/${eventType}`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-gray-600">Loading templates...</div>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Choose a Template (Optional)
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Templates provide pre-filled content and suggested charities to help you get started quickly.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* No Template Option */}
        <button
          type="button"
          onClick={() => onSelectTemplate(null)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            !selectedTemplateId
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-2xl mb-2">✨</div>
          <div className="font-semibold text-sm">Start from Scratch</div>
          <div className="text-xs text-gray-600 mt-1">Create your own custom event</div>
        </button>

        {/* Template Options */}
        {templates.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelectTemplate(template)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              selectedTemplateId === template.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-2xl mb-2">{template.icon || '🎉'}</div>
            <div className="font-semibold text-sm">{template.display_name}</div>
            {template.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
