import { useState, useCallback } from 'react';
import type { DispenseRecord, Patient, MedicationStock, MedicationLot } from '../types';

// Mock database for demo purposes
const MOCK_PATIENTS: Patient[] = [
  { id: 'p1', chartNumber: 'CH001234', firstName: 'John', lastName: 'Smith', dateOfBirth: new Date('1970-05-15'), allergies: ['Penicillin'] },
  { id: 'p2', chartNumber: 'CH001235', firstName: 'Jane', lastName: 'Doe', dateOfBirth: new Date('1985-08-22'), allergies: [] },
  { id: 'p3', chartNumber: 'CH001236', firstName: 'Bob', lastName: 'Johnson', dateOfBirth: new Date('1960-03-10'), allergies: ['Sulfa', 'Latex'] },
  { id: 'p4', chartNumber: 'CH001237', firstName: 'Alice', lastName: 'Williams', dateOfBirth: new Date('1992-11-30'), allergies: [] },
  { id: 'p5', chartNumber: 'CH001238', firstName: 'Charlie', lastName: 'Brown', dateOfBirth: new Date('1978-07-04'), allergies: ['Codeine'] },
];

const MOCK_RECORDS: DispenseRecord[] = [
  {
    id: 'r1',
    patientId: 'p1',
    patientName: 'John Smith',
    patientChartNumber: 'CH001234',
    medications: [{
      id: 'm1',
      medicationId: 'med1',
      medicationName: 'Amoxicillin 500mg',
      lotId: 'lot1',
      lotNumber: 'ABC123',
      amount: 30,
      unit: 'tablets',
      expirationDate: new Date('2025-12-01'),
    }],
    reasons: ['Scheduled Medication'],
    dispensedBy: '1',
    dispensedByName: 'Sarah Johnson',
    dispensedAt: new Date(),
    status: 'active',
  },
];

export function useDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPatients = useCallback(async (query: string): Promise<Patient[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const lowerQuery = query.toLowerCase();
      return MOCK_PATIENTS.filter(p => 
        p.chartNumber.toLowerCase().includes(lowerQuery) ||
        p.firstName.toLowerCase().includes(lowerQuery) ||
        p.lastName.toLowerCase().includes(lowerQuery)
      );
    } catch (err) {
      setError('Failed to search patients');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPatientByChartNumber = useCallback(async (chartNumber: string): Promise<Patient | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return MOCK_PATIENTS.find(p => p.chartNumber === chartNumber) || null;
    } catch (err) {
      setError('Failed to fetch patient');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDispenseRecord = useCallback(async (record: Omit<DispenseRecord, 'id'>): Promise<DispenseRecord> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newRecord: DispenseRecord = {
        ...record,
        id: Math.random().toString(36).substr(2, 9),
      };
      MOCK_RECORDS.push(newRecord);
      return newRecord;
    } catch (err) {
      setError('Failed to save record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDispenseRecords = useCallback(async (filters?: {
    patientId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<DispenseRecord[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let records = [...MOCK_RECORDS];
      
      if (filters?.patientId) {
        records = records.filter(r => r.patientId === filters.patientId);
      }
      if (filters?.status) {
        records = records.filter(r => r.status === filters.status);
      }
      
      return records.sort((a, b) => b.dispensedAt.getTime() - a.dispensedAt.getTime());
    } catch (err) {
      setError('Failed to fetch records');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRecord = useCallback(async (id: string, updates: Partial<DispenseRecord>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const index = MOCK_RECORDS.findIndex(r => r.id === id);
      if (index !== -1) {
        MOCK_RECORDS[index] = { ...MOCK_RECORDS[index], ...updates };
      }
    } catch (err) {
      setError('Failed to update record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchDispenses = useCallback(async (options?: {
    page?: number;
    pageSize?: number;
    patientId?: string;
    staffId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<{ data: DispenseRecord[]; total: number; page: number; pageSize: number }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;
      
      let records = [...MOCK_RECORDS];
      
      if (options?.patientId) {
        records = records.filter(r => r.patientId === options.patientId);
      }
      if (options?.staffId) {
        records = records.filter(r => r.dispensedBy === options.staffId);
      }
      if (options?.status) {
        records = records.filter(r => r.status === options.status);
      }
      if (options?.dateFrom) {
        const fromDate = new Date(options.dateFrom);
        records = records.filter(r => r.dispensedAt >= fromDate);
      }
      if (options?.dateTo) {
        const toDate = new Date(options.dateTo);
        records = records.filter(r => r.dispensedAt <= toDate);
      }
      
      records.sort((a, b) => b.dispensedAt.getTime() - a.dispensedAt.getTime());
      
      const total = records.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedRecords = records.slice(start, end);
      
      return {
        data: paginatedRecords,
        total,
        page,
        pageSize,
      };
    } catch (err) {
      setError('Failed to search dispenses');
      return { data: [], total: 0, page: 1, pageSize: 20 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    searchPatients,
    getPatientByChartNumber,
    saveDispenseRecord,
    getDispenseRecords,
    updateRecord,
    searchDispenses,
  };
}
