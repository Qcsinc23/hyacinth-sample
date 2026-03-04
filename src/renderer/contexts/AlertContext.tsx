import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { InventoryAlert, AlertSeverity } from '../types';

interface AlertContextType {
  alerts: InventoryAlert[];
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  addAlert: (alert: Omit<InventoryAlert, 'id' | 'createdAt'>) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlert: (id: string) => void;
  getAlertsBySeverity: (severity: AlertSeverity) => InventoryAlert[];
  getAlertsByMedication: (medicationId: string) => InventoryAlert[];
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Initial mock alerts
const INITIAL_ALERTS: InventoryAlert[] = [
  {
    id: '1',
    type: 'low_stock',
    severity: 'critical',
    medicationId: 'med1',
    medicationName: 'Amoxicillin 500mg',
    message: 'Stock below reorder point (5 units remaining)',
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'expiring',
    severity: 'warning',
    medicationId: 'med2',
    medicationName: 'Lisinopril 10mg',
    lotId: 'lot1',
    lotNumber: 'ABC123',
    message: 'Lot expires in 30 days',
    createdAt: new Date(),
  },
  {
    id: '3',
    type: 'expired',
    severity: 'critical',
    medicationId: 'med3',
    medicationName: 'Metformin 1000mg',
    lotId: 'lot2',
    lotNumber: 'XYZ789',
    message: 'Lot expired on 2024-01-15',
    createdAt: new Date(),
  },
];

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>(INITIAL_ALERTS);

  const unreadCount = useMemo(() => 
    alerts.filter(a => !a.acknowledgedAt).length, 
    [alerts]
  );

  const criticalCount = useMemo(() => 
    alerts.filter(a => a.severity === 'critical' && !a.acknowledgedAt).length, 
    [alerts]
  );

  const warningCount = useMemo(() => 
    alerts.filter(a => a.severity === 'warning' && !a.acknowledgedAt).length, 
    [alerts]
  );

  const addAlert = useCallback((alert: Omit<InventoryAlert, 'id' | 'createdAt'>) => {
    const newAlert: InventoryAlert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    setAlerts(prev => [newAlert, ...prev]);
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === id
          ? { ...alert, acknowledgedAt: new Date(), acknowledgedBy: 'current_user' }
          : alert
      )
    );
  }, []);

  const clearAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const getAlertsBySeverity = useCallback((severity: AlertSeverity) => {
    return alerts.filter(a => a.severity === severity);
  }, [alerts]);

  const getAlertsByMedication = useCallback((medicationId: string) => {
    return alerts.filter(a => a.medicationId === medicationId);
  }, [alerts]);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        unreadCount,
        criticalCount,
        warningCount,
        addAlert,
        acknowledgeAlert,
        clearAlert,
        getAlertsBySeverity,
        getAlertsByMedication,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
