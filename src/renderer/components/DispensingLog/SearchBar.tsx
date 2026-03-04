import React, { useState, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
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
  { value: 'completed', label: 'Completed' },
  { value: 'corrected', label: 'Corrected' },
  { value: 'voided', label: 'Voided' },
];

const dateRangePresets = [
  { label: 'Today', days: 0 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: '3 Months', days: 90 },
];

// ============================================================================
// Component
// ============================================================================

export const SearchBar: React.FC<SearchBarProps> = ({
  filters,
  onFiltersChange,
  className = '',
}) => {
  const applyDateRangePreset = useCallback(
    (days: number) => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      onFiltersChange({ ...filters, dateRange: { start, end } });
    },
    [filters, onFiltersChange]
  );

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
    filters.dateRange.end;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* Row 1: Search + Status dropdown */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by patient, chart number, or medication..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="w-40 flex-shrink-0">
          <select
            value={filters.statusFilter}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                statusFilter: e.target.value as RecordStatus | 'all',
              })
            }
            className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date presets + Clear */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-500">Quick date:</span>
        {dateRangePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyDateRangePreset(preset.days)}
            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            {preset.label}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Hook (preserved for compatibility)
// ============================================================================

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

  return { filters, setFilters, clearFilters };
};

export default SearchBar;
