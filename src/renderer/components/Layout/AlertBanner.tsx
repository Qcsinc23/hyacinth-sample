import React from 'react';
import { AlertTriangle, X, Bell, AlertCircle, Package } from 'lucide-react';
import { useAlerts } from '../../contexts/AlertContext';
import { audioAlerts } from '../../utils/audioAlerts';
import type { AlertSeverity } from '../../types';

interface AlertBannerProps {
  onInventoryClick?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onInventoryClick }) => {
  const { alerts, criticalCount, warningCount, acknowledgeAlert, getAlertsBySeverity } = useAlerts();

  const criticalAlerts = getAlertsBySeverity('critical').filter(a => !a.acknowledgedAt);
  const warningAlerts = getAlertsBySeverity('warning').filter(a => !a.acknowledgedAt);

  // Show the most recent unacknowledged alert
  const displayAlert = criticalAlerts[0] || warningAlerts[0];

  // Play sound when critical alert appears (once per alert)
  React.useEffect(() => {
    if (criticalAlerts.length > 0) {
      audioAlerts.critical();
    } else if (warningAlerts.length > 0) {
      audioAlerts.warning();
    }
  }, [displayAlert?.id]);

  if (!displayAlert) return null;

  const isCritical = displayAlert.severity === 'critical';
  const totalUnacknowledged = criticalAlerts.length + warningAlerts.length;

  const bgColor = isCritical 
    ? 'bg-gradient-to-r from-red-600 to-red-700' 
    : 'bg-gradient-to-r from-amber-500 to-orange-500';

  const pulseAnimation = isCritical 
    ? 'animate-pulse' 
    : '';

  const handleAcknowledge = () => {
    acknowledgeAlert(displayAlert.id);
  };

  const handleViewInventory = () => {
    if (onInventoryClick) {
      onInventoryClick();
    }
  };

  return (
    <div 
      className={`${bgColor} ${pulseAnimation} text-white relative overflow-hidden`} 
      role="alert" 
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      {/* Animated background effect for critical alerts */}
      {isCritical && (
        <div className="absolute inset-0 bg-white/10 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
      )}
      
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Alert icon with animation */}
            <div className={`p-1.5 rounded-full bg-white/20 ${isCritical ? 'animate-bounce' : ''}`}>
              <Bell className={`h-5 w-5 ${isCritical ? 'text-white' : 'text-amber-100'}`} />
            </div>
            
            <div className="flex items-center gap-2">
              {isCritical ? (
                <AlertTriangle className="h-5 w-5 text-white" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-100" />
              )}
              <span className="font-bold text-lg">
                {isCritical ? 'Critical Alert:' : 'Warning:'}
              </span>
              <span className="text-white/95 text-lg">
                {displayAlert.message}
              </span>
            </div>
            
            {/* Badge showing count of additional alerts */}
            {totalUnacknowledged > 1 && (
              <button
                onClick={handleViewInventory}
                className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Package className="h-3.5 w-3.5" />
                <span>+{totalUnacknowledged - 1} more</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Inventory button */}
            {onInventoryClick && (
              <button
                onClick={handleViewInventory}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                <Package className="h-4 w-4" />
                View Inventory
              </button>
            )}
            
            {/* Dismiss button */}
            <button
              onClick={handleAcknowledge}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Dismiss alert"
              title="Dismiss (press Escape)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss (visual only) */}
      <div className="h-0.5 bg-white/30">
        <div 
          className="h-full bg-white/60 animate-[shrink_10s_linear_forwards]" 
          style={{ 
            animationDuration: isCritical ? '30s' : '10s',
            transformOrigin: 'left'
          }} 
        />
      </div>
      
      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};

export default AlertBanner;
