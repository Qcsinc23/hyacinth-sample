import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Package,
  User,
  ClipboardList
} from 'lucide-react';
import { Button } from '../common/Button';
import type { DailySummaryReport as DailySummaryReportType } from '../../../main/reports/generator';

export const DailySummaryReport: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DailySummaryReportType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await window.electron.reports.dailySummary(date);
      setReport(data);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [date]);

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    if (!report) return;

    // Combine data for CSV
    const rows = [
      ['Daily Summary Report'],
      [`Date: ${date}`],
      ['Total Dispenses:', String(report.totalDispenses)],
      [''],
      ['By Medication'],
      ['Medication', 'Count', 'Total Quantity'],
      ...report.byMedication.map(m => [m.medicationName, String(m.count), String(m.totalQuantity)]),
      [''],
      ['By Staff'],
      ['Staff Name', 'Count'],
      ...report.byStaff.map(s => [s.staffName, String(s.count)]),
      [''],
      ['By Reason'],
      ['Reason', 'Count'],
      ...report.byReason.map(r => [r.reason, String(r.count)]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-summary-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg p-1">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-none focus:ring-0 text-sm"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={!report || loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            disabled={!report || loading}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading report...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="text-center border-b pb-6 print:block hidden">
            <h1 className="text-2xl font-bold text-gray-900">Daily Dispensing Summary Report</h1>
            <p className="text-gray-600 mt-2">Date: {new Date(date).toLocaleDateString()}</p>
            <p className="text-gray-500 text-sm">Generated: {new Date().toLocaleString()}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Dispenses</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalDispenses}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Medications</p>
                  <p className="text-2xl font-bold text-gray-900">{report.byMedication.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Staff Active</p>
                  <p className="text-2xl font-bold text-gray-900">{report.byStaff.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* By Medication */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Dispenses by Medication
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.byMedication.map((med, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{med.medicationName}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{med.count}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{med.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Staff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dispenses by Staff
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.byStaff.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">{staff.staffName}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{staff.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Reason */}
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Dispenses by Reason
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.byReason.map((reason, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">{reason.reason}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{reason.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No data available for the selected date.
        </div>
      )}
    </div>
  );
};

export default DailySummaryReport;