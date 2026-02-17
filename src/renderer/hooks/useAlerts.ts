import { useState, useCallback, useEffect, useRef } from 'react';
import type { InventoryAlert, AlertSeverity } from '../types';

interface UseAlertPollingOptions {
  interval?: number;
  severityFilter?: AlertSeverity[];
}

export function useAlertPolling(options: UseAlertPollingOptions = {}) {
  const { interval = 30000 } = options;
  const [alerts] = useState<InventoryAlert[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsPolling(true);
    
    try {
      // In a real app, this would be an IPC call to the main process
      // For demo, we'll simulate fetching from a mock API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // This would normally come from the backend
      // For now, we just update the last poll time
      setLastPollTime(new Date());
    } finally {
      setIsPolling(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    fetchAlerts(); // Initial fetch
    intervalRef.current = setInterval(fetchAlerts, interval);
  }, [fetchAlerts, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return {
    alerts,
    isPolling,
    lastPollTime,
    refresh,
    startPolling,
    stopPolling,
  };
}
