import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Calendar,
  Filter,
  X,
  Clock,
  ChevronDown,
  User,
  Pill,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Input } from '../common/Input';
import type { RecordStatus } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface SearchFilters {
  searchQuery: string;
  statusFilter: RecordStatus | 'all';
  dateRange: { start: Date | null; end: Date | null };
  medications: string[];
  staffId: string | 'all';
  chartNumber: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableMedications?: string[];
  availableStaff?: { id: string; name: string }[];
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const statusOptions: { value: RecordStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'corrected', label: 'Corrected' },
  { value: 'voided', label: 'Voided' },
];

const dateRangePresets = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'Last 3 Months', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'This Year', days: 365 },
];

const STORAGE_KEY = 'hyacinth:searchHistory';
const MAX_HISTORY_ITEMS = 10;

// ============================================================================
// Component
// ============================================================================

export const SearchBar: React.FC<SearchBarProps> = ({
  filters,
  onFiltersChange,
  availableMedications = [],
  availableStaff = [],
  className = '',
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search history on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToHistory = useCallback(() => {
    // Only save if there's an actual search
    if (!filters.searchQuery && filters.statusFilter === 'all' && 
        !filters.dateRange.start && !filters.dateRange.end &&
        filters.medications.length === 0 && filters.staffId === 'all' &&
        !filters.chartNumber) {
      return;
    }

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: filters.searchQuery || 'Advanced Search',
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    setSearchHistory((prev) => {
      // Check if similar search already exists
      const exists = prev.some(
        (s) =>
          s.filters.searchQuery === filters.searchQuery &&
          s.filters.statusFilter === filters.statusFilter
      );

      if (exists) return prev;

      const updated = [newSearch, ...prev].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [filters]);

  const loadFromHistory = useCallback((savedSearch: SavedSearch) => {
    onFiltersChange(savedSearch.filters);
    setShowHistory(false);
  }, [onFiltersChange]);

  const deleteFromHistory = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const applyDateRangePreset = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    onFiltersChange({
      ...filters,
      dateRange: { start, end },
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      searchQuery: '',
      statusFilter: 'all',
      dateRange: { start: null, end: null },
      medications: [],
      staffId: 'all',
      chartNumber: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchQuery ||
    filters.statusFilter !== 'all' ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.medications.length > 0 ||
    filters.staffId !== 'all' ||
    filters.chartNumber;

  const activeFilterCount = [
    filters.searchQuery,
    filters.statusFilter !== 'all',
    filters.dateRange.start || filters.dateRange.end,
    filters.medications.length > 0,
    filters.staffId !== 'all',
    filters.chartNumber,
  ].filter(Boolean).length;

  return (
    <div ref={containerRef} className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input with History */}
          <div className="flex-1 relative">
            <Input
              placeholder="Search by patient name, chart number, medication..."
              value={filters.searchQuery}
              onChange={(e) =>
                onFiltersChange({ ...filters, searchQuery: e.target.value })
              }
              onFocus={() => setShowHistory(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveToHistory();
                  setShowHistory(false);
                }
              }}
              leftIcon={<Search className="h-5 w-5" />}
              rightIcon={
                searchHistory.length > 0 ? (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                ) : undefined
              }
            />

            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-medium text-gray-600">
                    Recent Searches
                  </span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchHistory.map((savedSearch) => (
                    <div
                      key={savedSearch.id}
                      onClick={() => loadFromHistory(savedSearch)}
                      className="flex items-center justify-between p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {savedSearch.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(savedSearch.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => deleteFromHistory(savedSearch.id, e)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={filters.statusFilter}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  statusFilter: e.target.value as RecordStatus | 'all',
                })
              }
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showAdvancedFilters ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Quick Date Range Presets */}
        <div className="flex flex-wrap gap-2 mt-4">
          {dateRangePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyDateRangePreset(preset.days)}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {preset.label}
            </button>
          ))}
          {(filters.dateRange.start || filters.dateRange.end) && (
            <button
              onClick={() =>
                onFiltersChange({ ...filters, dateRange: { start: null, end: null } })
              }
              className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={
                    filters.dateRange.start
                      ? filters.dateRange.start.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        start: e.target.value ? new Date(e.target.value) : null,
                      },
                    })
                  }
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={
                    filters.dateRange.end
                      ? filters.dateRange.end.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        end: e.target.value ? new Date(e.target.value) : null,
                      },
                    })
                  }
                  className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                />
              </div>
            </div>

            {/* Chart Number Search */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Chart Number
              </label>
              <input
                type="text"
                placeholder="Enter chart number..."
                value={filters.chartNumber}
                onChange={(e) =>
                  onFiltersChange({ ...filters, chartNumber: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              />
            </div>

            {/* Staff Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                Dispensed By
              </label>
              <select
                value={filters.staffId}
                onChange={(e) =>
                  onFiltersChange({ ...filters, staffId: e.target.value })
                }
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
              >
                <option value="all">All Staff</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Medication Filter */}
            <div className="space-y-2 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Pill className="h-4 w-4" />
                Medications
              </label>
              <div className="flex flex-wrap gap-2">
                {availableMedications.map((medication) => (
                  <button
                    key={medication}
                    onClick={() => {
                      const newMedications = filters.medications.includes(medication)
                        ? filters.medications.filter((m) => m !== medication)
                        : [...filters.medications, medication];
                      onFiltersChange({ ...filters, medications: newMedications });
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      filters.medications.includes(medication)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {medication}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 px-3 py-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing search filters with history
 */
export const useSearchFilters = (
  _availableMedications: string[] = [],
  _availableStaff: { id: string; name: string }[] = []
) => {
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: '',
    statusFilter: 'all',
    dateRange: { start: null, end: null },
    medications: [],
    staffId: 'all',
    chartNumber: '',
  });

  const [searchHistory, setSearchHistory] = useState<SavedSearch[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const saveSearch = useCallback((name: string) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    setSearchHistory((prev) => {
      const updated = [newSearch, ...prev].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newSearch;
  }, [filters]);

  const loadSearch = useCallback((savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
  }, []);

  const deleteSearch = useCallback((id: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      statusFilter: 'all',
      dateRange: { start: null, end: null },
      medications: [],
      staffId: 'all',
      chartNumber: '',
    });
  }, []);

  return {
    filters,
    setFilters,
    searchHistory,
    saveSearch,
    loadSearch,
    deleteSearch,
    clearHistory,
    clearFilters,
  };
};

export default SearchBar;
