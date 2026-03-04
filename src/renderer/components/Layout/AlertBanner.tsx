import React from 'react';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import { useAlerts } from '../../contexts/AlertContext';

interface AlertBannerProps {
  onInventoryClick?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onInventoryClick }) => {
  const { getAlertsBySeverity, acknowledgeAlert } = useAlerts();

  const criticalAlerts = getAlertsBySeverity('critical').filter(a => !a.acknowledgedAt);
  const warningAlerts = getAlertsBySeverity('warning').filter(a => !a.acknowledgedAt);

  const displayAlert = criticalAlerts[0] || warningAlerts[0];

  if (!displayAlert) return null;

  const isCritical = displayAlert.severity === 'critical';
  const totalUnacknowledged = criticalAlerts.length + warningAlerts.length;

  return (
    <div
      className={`${isCritical ? 'bg-red-600' : 'bg-amber-500'} text-white px-4 py-2`}
      role="alert"
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <div className="flex items-center justify-between max-w-full mx-auto">
        <div className="flex items-center gap-2 text-sm">
          {isCritical ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="font-medium">{displayAlert.message}</span>
          {totalUnacknowledged > 1 && (
            <button
              onClick={onInventoryClick}
              className="ml-1 underline text-white/90 hover:text-white text-xs"
            >
              +{totalUnacknowledged - 1} more
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onInventoryClick && (
            <button
              onClick={onInventoryClick}
              className="text-xs underline text-white/90 hover:text-white hidden sm:inline"
            >
              View Inventory
            </button>
          )}
          <button
            onClick={() => acknowledgeAlert(displayAlert.id)}
            className="p-1 rounded hover:bg-white/20"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
