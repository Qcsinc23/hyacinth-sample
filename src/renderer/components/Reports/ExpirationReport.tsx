import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Download, 
  Printer, 
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Button } from '../common/Button';
import type { ExpirationReport as ExpirationReportType } from '../../../main/reports/generator';

export const ExpirationReport: React.FC = () => {
  const [days, setDays] = useState<number>(90);
  const [report, setReport] = useState<ExpirationReportType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (!window.electron?.reports?.expiration) {
        throw new Error('Reports API is not available');
      }
      const data = await window.electron.reports.expiration(days);
      setReport(data);
    } catch (error) {
      console.error('Error fetching expiration report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [days]);

  const handleExportCSV = () => {
    if (!report) return;

    const rows = [
      ['Expiration Report'],
      [`Generated: ${new Date(report.generatedAt).toLocaleString()}`],
      [`Days Threshold: ${report.daysThreshold}`],
      [''],
      ['Medication', 'Lot Number', 'Expiration Date', 'Days Until', 'Quantity', 'Unit', 'Status'],
      ...report.items.map(item => [
        item.medicationName,
        item.lotNumber,
        item.expirationDate,
        String(item.daysUntilExpiration),
        String(item.quantityOnHand),
        item.unit,
        item.status,
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiration-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'expiring_soon':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'expiring_soon':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring_soon':
        return 'Expiring Soon';
      default:
        return 'Expiring Later';
    }
  };

  const expiredItems = report?.items.filter(i => i.status === 'expired') || [];
  const expiringSoonItems = report?.items.filter(i => i.status === 'expiring_soon') || [];
  const expiringLaterItems = report?.items.filter(i => i.status === 'expiring_later') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-4 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-600">Show items expiring within:</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border-none focus:ring-0 text-sm font-medium"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
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
            <h1 className="text-2xl font-bold text-gray-900">Expiration Report</h1>
            <p className="text-gray-600">Items expiring within {days} days</p>
            <p className="text-gray-500 text-sm">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-gray-900">{expiredItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expiring Soon (≤30 days)</p>
                  <p className="text-2xl font-bold text-gray-900">{expiringSoonItems.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expiring Later</p>
                  <p className="text-2xl font-bold text-gray-900">{expiringLaterItems.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alert for Expired Items */}
          {expiredItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Expired Items Require Immediate Attention</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {expiredItems.length} item(s) have expired and should be quarantined or disposed of according to protocol.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Table */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Expiration Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days Left</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.items.map((item, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-gray-50 ${item.status === 'expired' ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium">{item.medicationName}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.lotNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {new Date(item.expirationDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-right">
                        {item.daysUntilExpiration < 0 ? (
                          <span className="text-red-600 font-medium">{item.daysUntilExpiration} days</span>
                        ) : item.daysUntilExpiration <= 7 ? (
                          <span className="text-orange-600 font-medium">{item.daysUntilExpiration} days</span>
                        ) : (
                          <span className="text-gray-900">{item.daysUntilExpiration} days</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {item.quantityOnHand} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items expiring within the selected timeframe.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No expiration data available.
        </div>
      )}
    </div>
  );
};

export default ExpirationReport;
