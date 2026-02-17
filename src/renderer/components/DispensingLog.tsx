import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, XCircle, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface User {
  id: number;
  name: string;
  role: string;
}

interface DispensingRecord {
  id: number;
  record_number: string;
  patient_name: string;
  chart_number: string;
  dispensed_by_name: string;
  dispensed_at: string;
  reason: string;
  status: string;
  item_count: number;
}

interface DispensingRecordDetail extends DispensingRecord {
  date_of_birth: string;
  phone: string;
  notes: string;
  line_items: Array<{
    medication_name: string;
    generic_name: string;
    quantity_dispensed: number;
    lot_number: string;
    expiration_date: string;
    dosing_instructions: string;
  }>;
}

interface DispensingLogProps {
  user: User;
}

export const DispensingLog: React.FC<DispensingLogProps> = ({ user }) => {
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedRecord, setSelectedRecord] = useState<DispensingRecordDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [startDate, endDate, status]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const filters: any = { status };
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      if (!window.electron?.dispensing?.getAll) {
        throw new Error('Dispensing API is not available');
      }
      const result = await window.electron.dispensing.getAll(filters);
      setRecords(result as DispensingRecord[]);
    } catch (err) {
      console.error('Error loading records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const viewRecord = async (id: number) => {
    try {
      if (!window.electron?.dispensing?.getById) {
        throw new Error('Dispensing API is not available');
      }
      const record = await window.electron.dispensing.getById(id);
      setSelectedRecord(record as DispensingRecordDetail);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error loading record details:', err);
    }
  };

  const handleVoid = async () => {
    if (!selectedRecord || !voidReason || pin.length !== 4) return;

    try {
      if (!window.electron?.staff?.verify || !window.electron?.dispensing?.void) {
        alert('API is not available. Please restart the application.');
        return;
      }
      // Verify PIN
      const verified = await window.electron.staff.verify(pin) as { success: boolean };
      if (!verified.success) {
        alert('Invalid PIN');
        return;
      }

      await window.electron.dispensing.void({
        record_id: selectedRecord.id,
        voided_by: user.id,
        reason: voidReason,
      });

      setShowVoidModal(false);
      setShowDetailModal(false);
      setVoidReason('');
      setPin('');
      loadRecords();
    } catch (err) {
      console.error('Error voiding record:', err);
      alert('Error voiding record. Please try again.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Record #', 'Patient', 'Chart #', 'Dispensed By', 'Date', 'Reason', 'Status'];
    const rows = filteredRecords.map((r) => [
      r.record_number,
      r.patient_name,
      r.chart_number,
      r.dispensed_by_name,
      format(parseISO(r.dispensed_at), 'yyyy-MM-dd HH:mm'),
      r.reason,
      r.status,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispensing-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.record_number.toLowerCase().includes(query) ||
      record.patient_name.toLowerCase().includes(query) ||
      record.chart_number.toLowerCase().includes(query) ||
      record.dispensed_by_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
          </div>
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="voided">Voided</option>
              <option value="corrected">Corrected</option>
              <option value="">All</option>
            </select>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chart #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispensed By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.record_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{record.patient_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{record.chart_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{record.dispensed_by_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(parseISO(record.dispensed_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'voided'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => viewRecord(record.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Dispensing Record: {selectedRecord.record_number}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-500">Patient:</span>
                  <p className="font-medium">{selectedRecord.patient_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Chart Number:</span>
                  <p className="font-medium">{selectedRecord.chart_number}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date of Birth:</span>
                  <p className="font-medium">{selectedRecord.date_of_birth || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone:</span>
                  <p className="font-medium">{selectedRecord.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Record Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Dispensed By:</span>
                  <p className="font-medium">{selectedRecord.dispensed_by_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date:</span>
                  <p className="font-medium">
                    {format(parseISO(selectedRecord.dispensed_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Reason:</span>
                  <p className="font-medium">{selectedRecord.reason || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ml-2 ${
                      selectedRecord.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : selectedRecord.status === 'voided'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedRecord.status}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Medications Dispensed</h4>
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Medication</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lot #</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedRecord.line_items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-medium">{item.medication_name}</div>
                          <div className="text-xs text-gray-500">{item.generic_name}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{item.quantity_dispensed}</td>
                        <td className="px-4 py-2 text-sm">{item.lot_number}</td>
                        <td className="px-4 py-2 text-sm">{item.expiration_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRecord.notes && (
                <div>
                  <span className="text-sm text-gray-500">Notes:</span>
                  <p className="mt-1 text-sm text-gray-900">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => window.electron?.window?.print?.()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                Print
              </button>
              {selectedRecord.status === 'active' && user.role !== 'staff' && (
                <button
                  onClick={() => setShowVoidModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Void Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Void Record</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to void this record? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Void</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter reason..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Verify PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-center text-xl tracking-widest"
                placeholder="••••"
                maxLength={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVoidModal(false);
                  setVoidReason('');
                  setPin('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidReason || pin.length !== 4}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                Void Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
