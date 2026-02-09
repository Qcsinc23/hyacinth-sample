import React, { useState } from 'react';
import { 
  FileText, 
  Package, 
  Calendar, 
  User, 
  Calculator,
  BarChart3
} from 'lucide-react';
import { DailySummaryReport } from './DailySummaryReport';
import { InventoryUsageReport } from './InventoryUsageReport';
import { ExpirationReport } from './ExpirationReport';
import { StaffActivityReport } from './StaffActivityReport';
import { ReconciliationReport } from './ReconciliationReport';

type ReportType = 'daily' | 'inventory' | 'expiration' | 'staff' | 'reconciliation';

interface ReportTab {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const reportTabs: ReportTab[] = [
  {
    id: 'daily',
    label: 'Daily Summary',
    description: 'Dispensing count by medication, staff, and reasons',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'inventory',
    label: 'Inventory Usage',
    description: 'Stock movement and depletion rates',
    icon: <Package className="w-5 h-5" />,
  },
  {
    id: 'expiration',
    label: 'Expiration',
    description: 'Upcoming expirations (30/60/90 days)',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'staff',
    label: 'Staff Activity',
    description: 'Actions per staff member',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'reconciliation',
    label: 'Reconciliation',
    description: 'End of day totals and balance',
    icon: <Calculator className="w-5 h-5" />,
  },
];

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');

  const renderReport = () => {
    switch (activeReport) {
      case 'daily':
        return <DailySummaryReport />;
      case 'inventory':
        return <InventoryUsageReport />;
      case 'expiration':
        return <ExpirationReport />;
      case 'staff':
        return <StaffActivityReport />;
      case 'reconciliation':
        return <ReconciliationReport />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Reports
        </h1>
        <p className="text-gray-600 mt-1">
          Generate and export reports for dispensing, inventory, and staff activity.
        </p>
      </div>

      {/* Report Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex flex-col items-start gap-1 p-4 rounded-lg border text-left transition-all ${
              activeReport === tab.id
                ? 'bg-blue-50 border-blue-500 text-blue-900'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className={`${activeReport === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
              {tab.icon}
            </div>
            <span className="font-medium text-sm">{tab.label}</span>
            <span className="text-xs text-gray-500 line-clamp-2">{tab.description}</span>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg border p-6">
        {renderReport()}
      </div>
    </div>
  );
};

export default ReportsPage;