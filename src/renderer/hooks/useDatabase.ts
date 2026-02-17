import { useState, useCallback } from 'react';
import type { DispenseRecord, Patient } from '../types';

export function useDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPatients = useCallback(async (query: string): Promise<Patient[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.electron?.patient?.search) {
        throw new Error('Patient API is not available');
      }
      const results = await window.electron.patient.search(query);
      return results as Patient[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search patients';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPatientByChartNumber = useCallback(async (chartNumber: string): Promise<Patient | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.electron?.patient?.getByChart) {
        throw new Error('Patient API is not available');
      }
      const patient = await window.electron.patient.getByChart(chartNumber);
      return patient as Patient | null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch patient';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDispenseRecord = useCallback(async (record: Omit<DispenseRecord, 'id'>): Promise<DispenseRecord> => {
    setIsLoading(true);
    setError(null);

    try {
      const now = record.dispensedAt || new Date();
      const dateObj = now instanceof Date ? now : new Date(now);
      const dispensingDate = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      const dispensingTime = dateObj.toTimeString().slice(0, 8);   // HH:MM:SS

      const reasons = record.reasons && record.reasons.length > 0 ? record.reasons : ['Other'];
      const isCustomReasons = reasons.map(() => false);

      // Backend CreateDispenseInput: patient_id, dispensing_date, dispensing_time, staff_id, label_quantity, items, reasons, is_custom_reasons, additional_notes
      const dispensingData = {
        patient_id: parseInt(record.patientId, 10),
        dispensing_date: dispensingDate,
        dispensing_time: dispensingTime,
        staff_id: parseInt(record.dispensedBy, 10),
        label_quantity: 1,
        additional_notes: record.notes || undefined,
        items: record.medications.map((med) => {
          const invId = parseInt(med.lotId, 10);
          return {
            medication_name: med.medicationName,
            is_custom_medication: false,
            amount_value: med.amount,
            amount_unit: med.unit,
            lot_number: med.lotNumber || undefined,
            expiration_date: med.expirationDate
              ? (med.expirationDate instanceof Date
                  ? med.expirationDate.toISOString().slice(0, 10)
                  : String(med.expirationDate).slice(0, 10))
              : undefined,
            inventory_id: Number.isNaN(invId) ? undefined : invId,
            dosing_instructions: undefined,
          };
        }),
        reasons,
        is_custom_reasons: isCustomReasons,
      };

      if (!window.electron?.dispensing?.create) {
        throw new Error('Dispensing API is not available');
      }
      const result = await window.electron.dispensing.create(dispensingData);
      return {
        ...record,
        id: result.id?.toString() ?? result.record_id?.toString() ?? String(Date.now()),
      } as DispenseRecord;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save record';
      setError(errorMessage);
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
      const searchFilters: any = {};
      
      if (filters?.patientId) {
        searchFilters.patientId = parseInt(filters.patientId);
      }
      if (filters?.status) {
        searchFilters.status = filters.status;
      }
      if (filters?.startDate) {
        searchFilters.dateFrom = filters.startDate.toISOString().split('T')[0];
      }
      if (filters?.endDate) {
        searchFilters.dateTo = filters.endDate.toISOString().split('T')[0];
      }

      if (!window.electron?.dispensing?.getAll) {
        throw new Error('Dispensing API is not available');
      }
      const results = await window.electron.dispensing.getAll(searchFilters);
      const rawList = Array.isArray(results) ? results : results?.data ?? [];

      const toRecordStatus = (s: string): 'active' | 'corrected' | 'voided' => {
        if (s === 'completed') return 'active';
        return ['active', 'corrected', 'voided'].includes(s) ? (s as 'active' | 'corrected' | 'voided') : 'active';
      };

      const buildDispensedAt = (r: any): Date => {
        if (r.dispensed_at) return new Date(r.dispensed_at);
        if (r.created_at) return new Date(r.created_at);
        if (r.dispensing_date) {
          const time = r.dispensing_time || '00:00:00';
          return new Date(`${r.dispensing_date}T${time}`);
        }
        return new Date();
      };

      // Transform backend results to DispenseRecord format (backend shape: patient, staff, items, reasons, dispensing_date/time)
      const records = rawList.map((r: any) => {
        const patientName = r.patient
          ? [r.patient.first_name, r.patient.last_name].filter(Boolean).join(' ').trim()
          : [r.patient_first_name, r.patient_last_name].filter(Boolean).join(' ').trim() || '';
        const patientChartNumber = r.patient?.chart_number ?? r.chart_number ?? '';
        const dispensedByName = r.staff
          ? [r.staff.first_name, r.staff.last_name].filter(Boolean).join(' ').trim()
          : [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' ').trim() || '';
        const items = r.items ?? r.line_items ?? r.medications ?? [];
        const reasons: string[] = Array.isArray(r.reasons)
          ? r.reasons.map((x: any) => (typeof x === 'string' ? x : x?.reason_name ?? ''))
          : r.reason ? [r.reason] : [];

        return {
          id: r.id?.toString() || r.record_id?.toString(),
          patientId: r.patient_id?.toString(),
          patientName,
          patientChartNumber,
          medications: items.map((item: any) => ({
            id: item.id?.toString() || Math.random().toString(36).substr(2, 9),
            medicationId: item.medication_id?.toString(),
            medicationName: item.medication_name,
            lotId: item.inventory_id?.toString(),
            lotNumber: item.lot_number,
            amount: item.amount_value ?? item.quantity_dispensed ?? item.amount ?? 0,
            unit: item.amount_unit ?? item.unit ?? 'tablets',
            expirationDate: item.expiration_date ? new Date(item.expiration_date) : null,
          })),
          reasons,
          dispensedBy: (r.staff_id ?? r.dispensed_by)?.toString(),
          dispensedByName,
          dispensedAt: buildDispensedAt(r),
          status: toRecordStatus(r.status || 'active'),
          notes: r.notes ?? r.additional_notes,
          recordNumber: r.record_number,
        };
      });
      
      return records.sort((a: DispenseRecord, b: DispenseRecord) => 
        b.dispensedAt.getTime() - a.dispensedAt.getTime()
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRecord = useCallback(async (id: string, updates: Partial<DispenseRecord>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For corrections, use the void + recreate pattern or correct API
      if (updates.status === 'voided') {
        if (!window.electron?.dispensing?.void) {
          throw new Error('Dispensing API is not available');
        }
        await window.electron.dispensing.void({
          record_id: parseInt(id),
          voided_by: parseInt(updates.void?.voidedBy || '0'),
          reason: updates.void?.reason || 'Record voided',
        });
      } else {
        // For other updates, we may need to use a different approach
        // Since there's no direct update, we might need to void and recreate
        // or use a correction endpoint if available
        throw new Error('Direct record updates not supported. Use void and recreate pattern.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update record';
      setError(errorMessage);
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
      const searchOptions: any = {
        page: options?.page || 1,
        pageSize: options?.pageSize || 20,
      };
      
      if (options?.patientId) {
        searchOptions.patientId = parseInt(options.patientId);
      }
      if (options?.staffId) {
        searchOptions.staffId = parseInt(options.staffId);
      }
      if (options?.status) {
        searchOptions.status = options.status;
      }
      if (options?.dateFrom) {
        searchOptions.dateFrom = options.dateFrom;
      }
      if (options?.dateTo) {
        searchOptions.dateTo = options.dateTo;
      }

      if (!window.electron?.dispensing?.getAll) {
        throw new Error('Dispensing API is not available');
      }
      const results = await window.electron.dispensing.getAll(searchOptions);
      
      // Handle both array and paginated response formats
      const rawData = Array.isArray(results) ? results : (results.data || []);
      const total = Array.isArray(results) ? rawData.length : (results.total || rawData.length);
      const page = Array.isArray(results) ? 1 : (results.page || 1);
      const pageSize = Array.isArray(results) ? rawData.length : (results.pageSize || 20);

      const toRecordStatus = (s: string): 'active' | 'corrected' | 'voided' => {
        if (s === 'completed') return 'active';
        return ['active', 'corrected', 'voided'].includes(s) ? (s as 'active' | 'corrected' | 'voided') : 'active';
      };
      const buildDispensedAt = (r: any): Date => {
        if (r.dispensed_at) return new Date(r.dispensed_at);
        if (r.created_at) return new Date(r.created_at);
        if (r.dispensing_date) {
          const time = r.dispensing_time || '00:00:00';
          return new Date(`${r.dispensing_date}T${time}`);
        }
        return new Date();
      };

      // Transform to DispenseRecord format (same backend shape as getDispenseRecords)
      const data = rawData.map((r: any) => {
        const patientName = r.patient
          ? [r.patient.first_name, r.patient.last_name].filter(Boolean).join(' ').trim()
          : [r.patient_first_name, r.patient_last_name].filter(Boolean).join(' ').trim() || '';
        const patientChartNumber = r.patient?.chart_number ?? r.chart_number ?? '';
        const dispensedByName = r.staff
          ? [r.staff.first_name, r.staff.last_name].filter(Boolean).join(' ').trim()
          : [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' ').trim() || '';
        const items = r.items ?? r.line_items ?? r.medications ?? [];
        const reasons: string[] = Array.isArray(r.reasons)
          ? r.reasons.map((x: any) => (typeof x === 'string' ? x : x?.reason_name ?? ''))
          : r.reason ? [r.reason] : [];
        return {
          id: r.id?.toString() || r.record_id?.toString(),
          patientId: r.patient_id?.toString(),
          patientName,
          patientChartNumber,
          medications: items.map((item: any) => ({
            id: item.id?.toString() || Math.random().toString(36).substr(2, 9),
            medicationId: item.medication_id?.toString(),
            medicationName: item.medication_name,
            lotId: item.inventory_id?.toString(),
            lotNumber: item.lot_number,
            amount: item.amount_value ?? item.quantity_dispensed ?? item.amount ?? 0,
            unit: item.amount_unit ?? item.unit ?? 'tablets',
            expirationDate: item.expiration_date ? new Date(item.expiration_date) : null,
          })),
          reasons,
          dispensedBy: (r.staff_id ?? r.dispensed_by)?.toString(),
          dispensedByName,
          dispensedAt: buildDispensedAt(r),
          status: toRecordStatus(r.status || 'active'),
          notes: r.notes ?? r.additional_notes,
          recordNumber: r.record_number,
        };
      });
      
      return {
        data,
        total,
        page,
        pageSize,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search dispenses';
      setError(errorMessage);
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
