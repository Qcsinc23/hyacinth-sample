import React from 'react';
import { AlertTriangle, Clock, Package, CheckCircle2, X } from 'lucide-react';
import { useAlerts } from '../../contexts/AlertContext';
import type { InventoryAlert } from '../../types';

export const AlertPanel: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlert, criticalCount, warningCount } = useAlerts();

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledgedAt);

  const getAlertIcon = (type: InventoryAlert['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-5 w-5 text-red-600" />;
      case 'expiring':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'reorder_needed':
        return <Package className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAlertStyle = (severity: InventoryAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (unacknowledgedAlerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <p className="font-medium text-emerald-900">All Clear</p>
          <p className="text-sm text-emerald-700">No pending inventory alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
          <h3 className="font-semibold text-gray-900">
            Inventory Alerts
            {unacknowledgedAlerts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({unacknowledgedAlerts.length} pending)
              </span>
            )}
          </h3>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
              {warningCount} Warning
            </span>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
        {unacknowledgedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 flex items-start gap-3 ${getAlertStyle(alert.severity)}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{alert.medicationName}</p>
              <p className="text-sm text-gray-600">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {alert.createdAt.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Acknowledge"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => clearAlert(alert.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertPanel;
