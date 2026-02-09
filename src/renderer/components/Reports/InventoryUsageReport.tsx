import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Download, 
  Printer, 
  TrendingDown, 
  AlertTriangle,
  RefreshCw,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { Button } from '../common/Button';
import type { InventoryUsageReport as InventoryUsageReportType } from '../../../main/reports/generator';

export const InventoryUsageReport: React.FC = () => {
  const [report, setReport] = useState<InventoryUsageReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'medication' | 'depletion'>('depletion');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await window.electron.reports.inventoryUsage();
      setReport(data);
    } catch (error) {
      console.error('Error fetching inventory usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const sortedItems = React.useMemo(() => {
    if (!report) return [];
    return [...report.items].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'medication') {
        comparison = a.medicationName.localeCompare(b.medicationName);
      } else {
        comparison = a.depletionRate - b.depletionRate;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [report, sortBy, sortOrder]);

  const handleExportCSV = () => {
    if (!report) return;

    const rows = [
      ['Inventory Usage Report'],
      [`Generated: ${new Date(report.generatedAt).toLocaleString()}`],
      [''],
      ['Medication', 'Lot Number', 'Initial Qty', 'Current Qty', 'Dispensed', 'Depletion Rate %', 'Est. Days Remaining', 'Unit'],
      ...sortedItems.map(item => [
        item.medicationName,
        item.lotNumber,
        String(item.initialQuantity),
        String(item.currentQuantity),
        String(item.dispensedQuantity),
        String(item.depletionRate.toFixed(2)),
        item.daysUntilDepleted ? String(item.daysUntilDepleted) : 'N/A',
        item.unit,
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSort = (column: 'medication' | 'depletion') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getDepletionColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-50';
    if (rate >= 70) return 'text-orange-600 bg-orange-50';
    if (rate >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
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
            <h1 className="text-2xl font-bold text-gray-900">Inventory Usage Report</h1>
            <p className="text-gray-500 text-sm">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{report.items.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">High Depletion (90%+)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.items.filter(i => i.depletionRate >= 90).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Medium Depletion (70%+)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.items.filter(i => i.depletionRate >= 70 && i.depletionRate < 90).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Dispensed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.items.reduce((sum, i) => sum + i.dispensedQuantity, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Inventory Usage Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('medication')}
                    >
                      <div className="flex items-center gap-1">
                        Medication
                        {sortBy === 'medication' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Initial</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dispensed</th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('depletion')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Depletion
                        {sortBy === 'depletion' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium">{item.medicationName}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.lotNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{item.initialQuantity}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{item.currentQuantity}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{item.dispensedQuantity}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getDepletionColor(item.depletionRate)}`}>
                          {item.depletionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {item.daysUntilDepleted ? (
                          item.daysUntilDepleted <= 30 ? (
                            <span className="text-red-600 font-medium">{item.daysUntilDepleted} days</span>
                          ) : (
                            `${item.daysUntilDepleted} days`
                          )
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No inventory data available.
        </div>
      )}
    </div>
  );
};

export default InventoryUsageReport;