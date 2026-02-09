import React, { useState, useEffect, useCallback } from 'react';
import { History, User, Clock, Pill, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useDatabase } from '../../hooks/useDatabase';
import type { Patient } from '../../types';

interface RecentPatientData {
  patient: Patient;
  lastDispensedAt: Date;
  lastMedication: string;
  dispenseCount: number;
}

interface RecentPatientsProps {
  onSelectPatient: (patient: Patient) => void;
  className?: string;
  maxDisplay?: number;
  refreshInterval?: number;
}

const STORAGE_KEY = 'hyacinth:recentPatients';

export const RecentPatients: React.FC<RecentPatientsProps> = ({
  onSelectPatient,
  className = '',
  maxDisplay = 10,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [recentPatients, setRecentPatients] = useState<RecentPatientData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { searchDispenses } = useDatabase();

  const loadRecentPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get recent dispensing records
      const result = await searchDispenses({
        page: 1,
        pageSize: 50,
      });

      if (!result?.data) {
        setIsLoading(false);
        return;
      }

      // Group by patient and get most recent
      const patientMap = new Map<string, RecentPatientData>();

      for (const record of result.data) {
        const patientId = record.patientId;
        
        if (!patientMap.has(patientId)) {
          const lastMedication = record.medications[0]?.medicationName || 'Unknown';
          
          patientMap.set(patientId, {
            patient: {
              id: record.patientId,
              chartNumber: record.patientChartNumber,
              firstName: record.patientName.split(' ')[0] || '',
              lastName: record.patientName.split(' ').slice(1).join(' ') || '',
              dateOfBirth: new Date(), // Will need to be fetched properly
              allergies: [],
            },
            lastDispensedAt: new Date(record.dispensedAt),
            lastMedication,
            dispenseCount: 1,
          });
        } else {
          const existing = patientMap.get(patientId)!;
          existing.dispenseCount++;
        }
      }

      // Convert to array and sort by last dispensed date
      const sorted = Array.from(patientMap.values())
        .sort((a, b) => b.lastDispensedAt.getTime() - a.lastDispensedAt.getTime())
        .slice(0, maxDisplay);

      setRecentPatients(sorted);

      // Save to localStorage for persistence
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          sorted.map((r) => ({
            patientId: r.patient.id,
            chartNumber: r.patient.chartNumber,
            firstName: r.patient.firstName,
            lastName: r.patient.lastName,
            lastDispensedAt: r.lastDispensedAt.toISOString(),
            lastMedication: r.lastMedication,
            dispenseCount: r.dispenseCount,
          }))
        )
      );
    } catch (error) {
      console.error('Error loading recent patients:', error);
      
      // Try to load from localStorage on error
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRecentPatients(
            parsed.map((p: any) => ({
              patient: {
                id: p.patientId,
                chartNumber: p.chartNumber,
                firstName: p.firstName,
                lastName: p.lastName,
                dateOfBirth: new Date(),
                allergies: [],
              },
              lastDispensedAt: new Date(p.lastDispensedAt),
              lastMedication: p.lastMedication,
              dispenseCount: p.dispenseCount,
            }))
          );
        } catch (e) {
          console.error('Failed to parse stored recent patients:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [maxDisplay, searchDispenses]);

  // Load on mount and refresh periodically
  useEffect(() => {
    loadRecentPatients();
    
    const interval = setInterval(loadRecentPatients, refreshInterval);
    return () => clearInterval(interval);
  }, [loadRecentPatients, refreshInterval]);

  const handleSelectPatient = useCallback(
    (recentData: RecentPatientData) => {
      onSelectPatient(recentData.patient);
    },
    [onSelectPatient]
  );

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (recentPatients.length === 0 && !isLoading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <History className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-600">Recent Patients</h3>
        </div>
        <p className="text-xs text-gray-500">
          Recently dispensed patients will appear here
        </p>
      </div>
    );
  }

  const displayedPatients = isExpanded
    ? recentPatients
    : recentPatients.slice(0, 5);
  const hasMore = recentPatients.length > 5;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Recent Patients ({recentPatients.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    Less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    More <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {displayedPatients.map((recentData) => (
          <div
            key={recentData.patient.id}
            onClick={() => handleSelectPatient(recentData)}
            className="p-3 hover:bg-blue-50 cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-gray-100 p-1.5 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {recentData.patient.firstName} {recentData.patient.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Chart: {recentData.patient.chartNumber}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      <Pill className="h-3 w-3" />
                      {recentData.lastMedication}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(recentData.lastDispensedAt)}
                </span>
                {recentData.dispenseCount > 1 && (
                  <span className="text-xs text-gray-400">
                    {recentData.dispenseCount} visits
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hook to track and add recent patients
 */
export const useRecentPatients = () => {
  const addRecentPatient = useCallback((patient: Patient, medicationName: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let recent: any[] = [];
    
    if (stored) {
      try {
        recent = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse recent patients:', e);
      }
    }

    // Remove if already exists
    recent = recent.filter((r) => r.patientId !== patient.id);

    // Add to beginning
    recent.unshift({
      patientId: patient.id,
      chartNumber: patient.chartNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      lastDispensedAt: new Date().toISOString(),
      lastMedication: medicationName,
      dispenseCount: 1,
    });

    // Keep only last 20
    recent = recent.slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  }, []);

  const getRecentPatients = useCallback((): RecentPatientData[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => ({
        patient: {
          id: p.patientId,
          chartNumber: p.chartNumber,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(),
          allergies: [],
        },
        lastDispensedAt: new Date(p.lastDispensedAt),
        lastMedication: p.lastMedication,
        dispenseCount: p.dispenseCount || 1,
      }));
    } catch (e) {
      console.error('Failed to parse recent patients:', e);
      return [];
    }
  }, []);

  const clearRecentPatients = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    addRecentPatient,
    getRecentPatients,
    clearRecentPatients,
  };
};

export default RecentPatients;
