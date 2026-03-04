/**
 * InstructionTemplatesPanel
 * Admin UI to browse and edit dispensing instruction templates
 */

import React, { useState, useEffect } from 'react';
import { FileText, Search, Save, ChevronDown, ChevronRight } from 'lucide-react';

interface InstructionTemplate {
  id: number;
  medicationName: string;
  strength: string | null;
  indication: string;
  context: string;
  shortDosing: string;
  fullInstructions: string;
  warnings: string;
}

function parseJsonArray(str: string): string[] {
  if (!str || typeof str !== 'string') return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [str];
  }
}

function toJsonArray(lines: string): string {
  const items = lines
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(items);
}

export const InstructionTemplatesPanel: React.FC = () => {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Record<
    number,
    { shortDosing: string; fullInstructions: string; warnings: string }
  >>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = (await window.electron?.instruction?.getAllInstructionTemplates?.()) ?? [];
        setTemplates(list);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load templates' });
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = search.trim()
    ? templates.filter(
        (t) =>
          t.medicationName.toLowerCase().includes(search.toLowerCase()) ||
          t.indication.toLowerCase().includes(search.toLowerCase()),
      )
    : templates;

  const handleExpand = (t: InstructionTemplate) => {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    if (!editing[t.id]) {
      const instructions = parseJsonArray(t.fullInstructions).join('\n');
      const warnings = parseJsonArray(t.warnings).join('\n');
      setEditing((prev) => ({
        ...prev,
        [t.id]: {
          shortDosing: t.shortDosing,
          fullInstructions: instructions,
          warnings,
        },
      }));
    }
  };

  const handleEditChange = (
    id: number,
    field: 'shortDosing' | 'fullInstructions' | 'warnings',
    value: string,
  ) => {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { shortDosing: '', fullInstructions: '', warnings: '' }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (id: number) => {
    const e = editing[id];
    if (!e) return;

    setSavingId(id);
    setMessage(null);
    try {
      const updated = await window.electron?.instruction?.updateInstructionTemplate?.({
        id,
        shortDosing: e.shortDosing.trim() || undefined,
        fullInstructions: toJsonArray(e.fullInstructions) || undefined,
        warnings: toJsonArray(e.warnings) || undefined,
      });

      if (updated) {
        setMessage({ type: 'success', text: 'Saved successfully' });
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  shortDosing: e.shortDosing,
                  fullInstructions: toJsonArray(e.fullInstructions),
                  warnings: toJsonArray(e.warnings),
                }
              : t,
          ),
        );
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Save failed' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading instruction templates...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Dispensing Instructions</h3>
          <p className="text-sm text-gray-500">
            Edit the directions and instructions that appear on labels. Changes apply immediately.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by medication or indication..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No templates found. {search ? 'Try a different search.' : ''}
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-white">
              <button
                onClick={() => handleExpand(t)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                {expandedId === t.id ? (
                  <ChevronDown className="h-5 w-5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{t.medicationName}</span>
                  {t.strength && (
                    <span className="text-gray-500 text-sm ml-2">({t.strength})</span>
                  )}
                  <p className="text-sm text-gray-600 truncate">{t.indication}</p>
                </div>
              </button>

              {expandedId === t.id && editing[t.id] && (
                <div className="px-4 pb-4 pt-0 ml-8 space-y-4 bg-gray-50">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Directions (shows on label)
                    </label>
                    <textarea
                      value={editing[t.id].shortDosing}
                      onChange={(e) => handleEditChange(t.id, 'shortDosing', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="e.g. Take 1 tablet by mouth twice daily for 7 days."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructions (one per line)
                    </label>
                    <textarea
                      value={editing[t.id].fullInstructions}
                      onChange={(e) => handleEditChange(t.id, 'fullInstructions', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                      placeholder="One instruction per line"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warnings (one per line)
                    </label>
                    <textarea
                      value={editing[t.id].warnings}
                      onChange={(e) => handleEditChange(t.id, 'warnings', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                      placeholder="One warning per line"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(t.id)}
                    disabled={savingId === t.id}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4" />
                    {savingId === t.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InstructionTemplatesPanel;
