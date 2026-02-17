import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Ban, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { DispenseRecord, RecordStatus } from '../../types';
import { useDatabase } from '../../hooks/useDatabase';
import { sanitizeInput } from '../../utils/sanitize';

interface LogTableProps {
  onViewRecord: (record: DispenseRecord) => void;
  onCorrectRecord: (record: DispenseRecord) => void;
  onVoidRecord: (record: DispenseRecord) => void;
  searchQuery: string;
  statusFilter: RecordStatus | 'all';
  dateRange: { start: Date | null; end: Date | null };
}

const statusIcons: Record<RecordStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  corrected: <AlertCircle className="h-4 w-4 text-amber-600" />,
  voided: <XCircle className="h-4 w-4 text-red-600" />,
};

const statusLabels: Record<RecordStatus, string> = {
  active: 'Active',
  corrected: 'Corrected',
  voided: 'Voided',
};

const statusStyles: Record<RecordStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  corrected: 'bg-amber-100 text-amber-800',
  voided: 'bg-red-100 text-red-800',
};

export const LogTable: React.FC<LogTableProps> = ({
  onViewRecord,
  onCorrectRecord,
  onVoidRecord,
  searchQuery,
  statusFilter,
  dateRange,
}) => {
  const [records, setRecords] = useState<DispenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getDispenseRecords } = useDatabase();

  useEffect(() => {
    loadRecords();
  }, [statusFilter, dateRange]);

  const loadRecords = async () => {
    setIsLoading(true);
    const filters: any = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (dateRange.start) filters.startDate = dateRange.start;
    if (dateRange.end) filters.endDate = dateRange.end;
    
    const data = await getDispenseRecords(filters);
    setRecords(data);
    setIsLoading(false);
  };

  const filteredRecords = records.filter(record => {
    const query = sanitizeInput(searchQuery).toLowerCase();
    return (
      sanitizeInput(record.patientName).toLowerCase().includes(query) ||
      sanitizeInput(record.patientChartNumber).toLowerCase().includes(query) ||
      sanitizeInput(record.dispensedByName).toLowerCase().includes(query) ||
      record.medications.some(m => sanitizeInput(m.medicationName).toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medications
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dispensed By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No dispensing records found
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr 
                  key={record.id}
                  className={`hover:bg-gray-50 transition-colors ${record.status === 'voided' ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[record.status]}`}>
                      {statusIcons[record.status]}
                      {statusLabels[record.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{sanitizeInput(record.patientName)}</div>
                    <div className="text-xs text-gray-500">{sanitizeInput(record.patientChartNumber)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {record.medications.length} medication(s)
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {record.medications.map(m => sanitizeInput(m.medicationName)).join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sanitizeInput(record.dispensedByName)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {record.dispensedAt.toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.dispensedAt.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {record.status === 'active' && (
                        <>
                          <button
                            onClick={() => onCorrectRecord(record)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Correct Record"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onVoidRecord(record)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Void Record"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogTable;
