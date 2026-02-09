import React, { useState, useEffect } from 'react';
import { 
  User, 
  Download, 
  Printer, 
  Calendar,
  RefreshCw,
  Activity,
  Edit3,
  Trash2,
  Package,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '../common/Button';
import type { StaffActivityReport as StaffActivityReportType } from '../../../main/reports/generator';

export const StaffActivityReport: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [staffId, setStaffId] = useState<string>('all');
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string }>>([]);
  const [report, setReport] = useState<StaffActivityReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'dispenses'>('dispenses');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Load staff list
    const loadStaff = async () => {
      try {
        const staff = await window.electron.staff.getAll();
        setStaffList(staff.map((s: any) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` })));
      } catch (error) {
        console.error('Error loading staff:', error);
      }
    };
    loadStaff();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await window.electron.reports.staffActivity(
        staffId === 'all' ? null : staffId,
        { from: dateFrom, to: dateTo }
      );
      setReport(data);
    } catch (error) {
      console.error('Error fetching staff activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateFrom, dateTo, staffId]);

  const sortedActivities = React.useMemo(() => {
    if (!report) return [];
    return [...report.staffActivities].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.staffName.localeCompare(b.staffName);
      } else {
        comparison = a.totalDispenses - b.totalDispenses;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [report, sortBy, sortOrder]);

  const handleExportCSV = () => {
    if (!report) return;

    const rows = [
      ['Staff Activity Report'],
      [`Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`],
      [''],
      ['Staff Name', 'Total Dispenses', 'Corrections', 'Voids', 'Inventory Adjustments', 'Last Activity'],
      ...sortedActivities.map(a => [
        a.staffName,
        String(a.totalDispenses),
        String(a.corrections),
        String(a.voids),
        String(a.inventoryAdjustments),
        a.lastActivity || 'N/A',
      ]),
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-activity-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSort = (column: 'name' | 'dispenses') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <User className="w-4 h-4 text-gray-500" />
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            >
              <option value="all">All Staff</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
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
            <h1 className="text-2xl font-bold text-gray-900">Staff Activity Report</h1>
            <p className="text-gray-600">
              Period: {new Date(dateFrom).toLocaleDateString()} - {new Date(dateTo).toLocaleDateString()}
            </p>
            <p className="text-gray-500 text-sm">Generated: {new Date().toLocaleString()}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{report.staffActivities.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Dispenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.staffActivities.reduce((sum, a) => sum + a.totalDispenses, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Edit3 className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Corrections</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.staffActivities.reduce((sum, a) => sum + a.corrections, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Voids</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.staffActivities.reduce((sum, a) => sum + a.voids, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Staff Activity Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Staff Name
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleSort('dispenses')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Dispenses
                        {sortBy === 'dispenses' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Corrections</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Voids</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      <div className="flex items-center justify-end gap-1">
                        <Package className="w-3 h-3" />
                        Inv. Adjustments
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedActivities.map((activity, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium">{activity.staffName}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        <span className="inline-flex items-center gap-1">
                          <Activity className="w-3 h-3 text-green-600" />
                          {activity.totalDispenses}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-right">
                        {activity.corrections > 0 ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <Edit3 className="w-3 h-3" />
                            {activity.corrections}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-right">
                        {activity.voids > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <Trash2 className="w-3 h-3" />
                            {activity.voids}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{activity.inventoryAdjustments}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {activity.lastActivity ? (
                          new Date(activity.lastActivity).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">No activity</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedActivities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No staff activity found for the selected period.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No activity data available.
        </div>
      )}
    </div>
  );
};

export default StaffActivityReport;