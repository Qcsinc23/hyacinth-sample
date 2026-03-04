import React, { useState, useMemo } from 'react';
import { FileText, ChevronDown, Search, X, Pill, Clock, AlertTriangle } from 'lucide-react';
import { DISPENSING_TEMPLATES, type DispensingTemplate } from '../../data/dispensingTemplates';

interface TemplateSelectorProps {
  onSelectTemplate: (template: DispensingTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
  disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelectTemplate,
  selectedTemplateId,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(DISPENSING_TEMPLATES.map((t) => t.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    let templates = DISPENSING_TEMPLATES;

    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.medicationName.toLowerCase().includes(query)
      );
    }

    return templates;
  }, [selectedCategory, searchQuery]);

  const selectedTemplate = useMemo(
    () => DISPENSING_TEMPLATES.find((t) => t.id === selectedTemplateId),
    [selectedTemplateId]
  );

  const handleSelect = (template: DispensingTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      nPEP: 'bg-purple-100 text-purple-700',
      PrEP: 'bg-green-100 text-green-700',
      Treatment: 'bg-blue-100 text-blue-700',
      Prophylaxis: 'bg-orange-100 text-orange-700',
      UTI: 'bg-pink-100 text-pink-700',
      STI: 'bg-red-100 text-red-700',
      Other: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors.Other;
  };

  if (selectedTemplate) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(
                  selectedTemplate.category
                )}`}
              >
                {selectedTemplate.category}
              </span>
              <span className="text-xs text-gray-500">
                {selectedTemplate.quantity} {selectedTemplate.unit}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2">
                <Pill className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {selectedTemplate.medicationName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedTemplate.directions}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-gray-600">
                  {selectedTemplate.daySupply} day supply
                </p>
              </div>

              {selectedTemplate.warnings && selectedTemplate.warnings.length > 0 && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <ul className="text-sm text-amber-700 space-y-1">
                    {selectedTemplate.warnings.slice(0, 2).map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onSelectTemplate(null as any)}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={disabled}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white border-gray-300 hover:border-blue-500 text-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <span>Select a dispensing template...</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Search and Filter Header */}
          <div className="p-3 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No templates found
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-3 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${getCategoryColor(
                              template.category
                            )}`}
                          >
                            {template.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.quantity} {template.unit}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {template.medicationName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {template.daySupply} day supply
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {filteredTemplates.length} template
              {filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Quick template buttons for common scenarios
 */
interface QuickTemplateButtonsProps {
  onSelectTemplate: (template: DispensingTemplate) => void;
  className?: string;
  limit?: number;
}

export const QuickTemplateButtons: React.FC<QuickTemplateButtonsProps> = ({
  onSelectTemplate,
  className = '',
  limit = 6,
}) => {
  const quickTemplates = DISPENSING_TEMPLATES.slice(0, limit);

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {quickTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(template)}
          className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded inline-block mb-1 ${
              template.category === 'nPEP'
                ? 'bg-purple-100 text-purple-700'
                : template.category === 'PrEP'
                ? 'bg-green-100 text-green-700'
                : template.category === 'Treatment'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {template.category}
          </span>
          <p className="text-sm font-medium text-gray-900 truncate">
            {template.name}
          </p>
          <p className="text-xs text-gray-500">
            {template.quantity} {template.unit}
          </p>
        </button>
      ))}
    </div>
  );
};

export default TemplateSelector;
