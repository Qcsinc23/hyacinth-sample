import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Download, 
  Printer, 
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Button } from '../common/Button';
import type { ReconciliationReport as ReconciliationReportType } from '../../../main/reports/generator';

export const ReconciliationReport: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ReconciliationReportType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await window.electron.reports.reconciliation(date);
      setReport(data);
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
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

    const rows = [
      ['End-of-Day Reconciliation Report'],
      [`Date: ${date}`],
      [''],
      ['Summary'],
      ['Opening Balance:', String(report.openingBalance)],
      ['Dispensed:', String(report.dispensed)],
      ['Adjustments:', String(report.adjustments)],
      ['Closing Balance:', String(report.closingBalance)],
      ['Discrepancy:', String(report.discrepancy || 0)],
      [''],
      ['Medication Details'],
      ['Medication', 'Opening', 'Received', 'Dispensed', 'Adjusted', 'Closing'],
      ...report.medications.map(m => [
        m.medicationName,
        String(m.openingStock),
        String(m.received),
        String(m.dispensed),
        String(m.adjusted),
        String(m.closingStock),
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${date}.csv`;
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
              <ArrowLeft className="w-5 h-5" />
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
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
            <h1 className="text-2xl font-bold text-gray-900">End-of-Day Reconciliation Report</h1>
            <p className="text-gray-600 mt-2">Date: {new Date(date).toLocaleDateString()}</p>
            <p className="text-gray-500 text-sm">Generated: {new Date().toLocaleString()}</p>
          </div>

          {/* Discrepancy Alert */}
          {report.discrepancy && report.discrepancy !== 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Discrepancy Detected</h3>
                  <p className="text-red-700 text-sm mt-1">
                    There is a discrepancy of {Math.abs(report.discrepancy)} units. 
                    Please review the inventory transactions for this date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(!report.discrepancy || report.discrepancy === 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Reconciliation Balanced</h3>
                  <p className="text-green-700 text-sm mt-1">
                    Inventory balances match expected values for this date.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opening</p>
                  <p className="text-2xl font-bold text-gray-900">{report.openingBalance}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dispensed</p>
                  <p className="text-2xl font-bold text-gray-900">{report.dispensed}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Calculator className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Adjustments</p>
                  <p className="text-2xl font-bold text-gray-900">{report.adjustments}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Closing</p>
                  <p className="text-2xl font-bold text-gray-900">{report.closingBalance}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-4 ${report.discrepancy && report.discrepancy !== 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${report.discrepancy && report.discrepancy !== 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <AlertCircle className={`w-5 h-5 ${report.discrepancy && report.discrepancy !== 0 ? 'text-red-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discrepancy</p>
                  <p className={`text-2xl font-bold ${report.discrepancy && report.discrepancy !== 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {report.discrepancy || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Formula */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Reconciliation Formula</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="bg-white px-2 py-1 rounded border">Opening ({report.openingBalance})</span>
              <span>-</span>
              <span className="bg-white px-2 py-1 rounded border">Dispensed ({report.dispensed})</span>
              <span>+</span>
              <span className="bg-white px-2 py-1 rounded border">Adjustments ({report.adjustments})</span>
              <span>=</span>
              <span className="bg-white px-2 py-1 rounded border font-medium">Expected ({report.openingBalance - report.dispensed + report.adjustments})</span>
              <span>vs</span>
              <span className="bg-white px-2 py-1 rounded border font-medium">Actual ({report.closingBalance})</span>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Medication Reconciliation Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dispensed</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adjusted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.medications.map((med, idx) => {
                    const expected = med.openingStock + med.received - med.dispensed + med.adjusted;
                    const diff = med.closingStock - expected;
                    return (
                      <tr key={idx} className={`hover:bg-gray-50 ${diff !== 0 ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-3 text-sm text-gray-900 font-medium">{med.medicationName}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right">{med.openingStock}</td>
                        <td className="px-6 py-3 text-sm text-green-600 text-right">+{med.received}</td>
                        <td className="px-6 py-3 text-sm text-red-600 text-right">-{med.dispensed}</td>
                        <td className="px-6 py-3 text-sm text-yellow-600 text-right">
                          {med.adjusted > 0 ? '+' : ''}{med.adjusted}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{med.closingStock}</td>
                        <td className="px-6 py-3 text-sm text-right">
                          {diff !== 0 ? (
                            <span className="text-red-600 font-medium">{expected} ({diff > 0 ? '+' : ''}{diff})</span>
                          ) : (
                            <span className="text-green-600">{expected}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {report.medications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No medication data available for reconciliation.
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="border-t pt-6 mt-8 print:block hidden">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-8">Prepared By:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm text-gray-900">Signature</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-8">Verified By:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm text-gray-900">Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No reconciliation data available for the selected date.
        </div>
      )}
    </div>
  );
};

export default ReconciliationReport;