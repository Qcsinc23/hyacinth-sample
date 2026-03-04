import { useState, useCallback, useEffect } from 'react';
import type { MedicationStock, MedicationLot } from '../types';

/**
 * Lot validation result interface
 */
export interface LotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lot?: MedicationLot;
}

/**
 * Available lot with additional metadata
 */
export interface AvailableLot extends MedicationLot {
  medicationName: string;
  daysUntilExpiration: number;
  expirationWarning?: string;
  isExpiringSoon: boolean; // Within 90 days
  isExpired: boolean;
}

// API response types from backend
interface BackendInventory {
  id: number;
  medication_name: string;
  lot_number: string;
  ndc_code: string | null;
  expiration_date: string;
  quantity_received: number;
  quantity_on_hand: number;
  unit: string;
  supplier: string | null;
  storage_location: string | null;
  status: 'active' | 'expired' | 'depleted' | 'quarantined';
}

/**
 * Transform backend inventory records to frontend MedicationStock format
 */
function transformInventoryToStock(inventoryList: BackendInventory[]): MedicationStock[] {
  // Group by medication name
  const medicationMap = new Map<string, BackendInventory[]>();

  inventoryList.forEach(item => {
    if (!medicationMap.has(item.medication_name)) {
      medicationMap.set(item.medication_name, []);
    }
    medicationMap.get(item.medication_name)!.push(item);
  });

  // Transform to MedicationStock
  return Array.from(medicationMap.entries()).map(([medicationName, items]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity_on_hand, 0);
    const firstItem = items[0];

    // Transform lots
    const lots: MedicationLot[] = items
      .filter(item => item.quantity_on_hand > 0)
      .map(item => ({
        id: item.id.toString(),
        medicationId: medicationName,
        lotNumber: item.lot_number,
        expirationDate: new Date(item.expiration_date),
        quantityOnHand: item.quantity_on_hand,
        unitOfMeasure: item.unit,
        receivedDate: new Date(), // Backend doesn't provide this in summary
      }))
      .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

    return {
      id: medicationName,
      name: medicationName,
      genericName: medicationName,
      category: 'Medication',
      dosageForm: getDosageFormFromUnit(firstItem.unit),
      strength: '',
      controlledSubstance: false,
      lots,
      totalQuantity,
      reorderPoint: 30,
      reorderQuantity: 100,
    };
  });
}

/**
 * Get dosage form from unit
 */
function getDosageFormFromUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'tablet': 'Tablet',
    'tablets': 'Tablet',
    'capsule': 'Capsule',
    'capsules': 'Capsule',
    'vial': 'Injection',
    'vials': 'Injection',
    'ml': 'Liquid',
    'ampule': 'Injection',
    'ampules': 'Injection',
    'packet': 'Packet',
    'packets': 'Packet',
    'dose': 'Injection',
    'doses': 'Injection',
  };
  return unitMap[unit.toLowerCase()] || 'Other';
}

// Mock inventory data (fallback when API is not available)
export const MOCK_INVENTORY: MedicationStock[] = [
  {
    id: 'med1',
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin',
    category: 'Antibiotic',
    dosageForm: 'Capsule',
    strength: '500mg',
    controlledSubstance: false,
    lots: [
      { id: 'lot1', medicationId: 'med1', lotNumber: 'ABC123', expirationDate: new Date('2025-12-01'), quantityOnHand: 5, unitOfMeasure: 'capsules', receivedDate: new Date('2024-01-15') },
      { id: 'lot2', medicationId: 'med1', lotNumber: 'DEF456', expirationDate: new Date('2025-06-15'), quantityOnHand: 50, unitOfMeasure: 'capsules', receivedDate: new Date('2024-02-20') },
    ],
    totalQuantity: 55,
    reorderPoint: 20,
    reorderQuantity: 100,
  },
  {
    id: 'med2',
    name: 'Lisinopril 10mg',
    genericName: 'Lisinopril',
    category: 'Antihypertensive',
    dosageForm: 'Tablet',
    strength: '10mg',
    controlledSubstance: false,
    lots: [
      { id: 'lot3', medicationId: 'med2', lotNumber: 'XYZ789', expirationDate: new Date('2025-03-15'), quantityOnHand: 30, unitOfMeasure: 'tablets', receivedDate: new Date('2024-01-10') },
    ],
    totalQuantity: 30,
    reorderPoint: 15,
    reorderQuantity: 60,
  },
  {
    id: 'med3',
    name: 'Metformin 1000mg',
    genericName: 'Metformin',
    category: 'Antidiabetic',
    dosageForm: 'Tablet',
    strength: '1000mg',
    controlledSubstance: false,
    lots: [
      { id: 'lot4', medicationId: 'med3', lotNumber: 'GHI012', expirationDate: new Date('2024-01-15'), quantityOnHand: 0, unitOfMeasure: 'tablets', receivedDate: new Date('2023-06-01') },
      { id: 'lot5', medicationId: 'med3', lotNumber: 'JKL345', expirationDate: new Date('2025-09-20'), quantityOnHand: 100, unitOfMeasure: 'tablets', receivedDate: new Date('2024-02-01') },
    ],
    totalQuantity: 100,
    reorderPoint: 25,
    reorderQuantity: 120,
  },
  {
    id: 'med4',
    name: 'Oxycodone 5mg',
    genericName: 'Oxycodone',
    category: 'Opioid Analgesic',
    dosageForm: 'Tablet',
    strength: '5mg',
    controlledSubstance: true,
    schedule: 'II',
    lots: [
      { id: 'lot6', medicationId: 'med4', lotNumber: 'CTRL01', expirationDate: new Date('2025-08-30'), quantityOnHand: 20, unitOfMeasure: 'tablets', receivedDate: new Date('2024-01-20') },
    ],
    totalQuantity: 20,
    reorderPoint: 10,
    reorderQuantity: 30,
  },
];

export function useInventory() {
  const [inventory, setInventory] = useState<MedicationStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory from backend on mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (window.electron?.inventory?.search) {
          // Use search API with empty string to get all inventory
          const result = await window.electron.inventory.search({ pageSize: 1000 }) as any;
          if (result?.data) {
            const stockList = transformInventoryToStock(result.data);
            setInventory(stockList);
            console.log('[useInventory] Loaded', stockList.length, 'medications');
          } else {
            console.warn('[useInventory] No data in search result:', result);
          }
        } else if (window.electron?.inventory?.getAllLots) {
          // Fallback to getAllLots
          const result = await window.electron.inventory.getAllLots({ pageSize: 1000 }) as any;
          if (result?.data) {
            const stockList = transformInventoryToStock(result.data);
            setInventory(stockList);
          }
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
        // Fallback to mock data
        setInventory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const getAllMedications = useCallback(async (): Promise<MedicationStock[]> => {
    return inventory;
  }, [inventory]);

  const getMedicationById = useCallback(async (id: string): Promise<MedicationStock | null> => {
    // Synchronous in-memory lookup — no artificial delay
    return inventory.find(m => m.id === id) || null;
  }, [inventory]);

  const searchMedications = useCallback(async (query: string): Promise<MedicationStock[]> => {
    setIsLoading(true);
    try {
      // Actually call the backend API with the search query
      if (window.electron?.inventory?.search) {
        // Always call the API, even with empty query, to get fresh results
        const result = await window.electron.inventory.search({
          search: query || undefined,  // Don't send empty string
          pageSize: query ? 100 : 1000  // Get more results when no filter
        }) as any;
        if (result?.data) {
          const stockList = transformInventoryToStock(result.data);
          return stockList;
        } else if (Array.isArray(result)) {
          // Handle case where result is directly an array
          const stockList = transformInventoryToStock(result);
          return stockList;
        }
      }
      // Fallback to filtering cached inventory
      const lowerQuery = query.toLowerCase();
      return inventory.filter(m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.genericName?.toLowerCase().includes(lowerQuery) ||
        m.category.toLowerCase().includes(lowerQuery)
      );
    } finally {
      setIsLoading(false);
    }
  }, [inventory]);

  const getLotsForMedication = useCallback((medicationId: string): MedicationLot[] => {
    const med = inventory.find(m => m.id === medicationId);
    if (!med) return [];
    
    // Return lots sorted by expiration date (FIFO)
    return [...med.lots]
      .filter(l => l.quantityOnHand > 0)
      .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
  }, [inventory]);

  const receiveStock = useCallback(async (medicationId: string, lot: Omit<MedicationLot, 'id' | 'medicationId'>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setInventory(prev => prev.map(med => {
        if (med.id !== medicationId) return med;
        
        const newLot: MedicationLot = {
          ...lot,
          id: Math.random().toString(36).substr(2, 9),
          medicationId,
        };
        
        return {
          ...med,
          lots: [...med.lots, newLot],
          totalQuantity: med.totalQuantity + lot.quantityOnHand,
        };
      }));
    } catch (err) {
      setError('Failed to receive stock');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const adjustStock = useCallback(async (medicationId: string, lotId: string, newQuantity: number, _reason: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setInventory(prev => prev.map(med => {
        if (med.id !== medicationId) return med;
        
        const updatedLots = med.lots.map(lot => {
          if (lot.id !== lotId) return lot;
          return { ...lot, quantityOnHand: newQuantity };
        });
        
        const newTotal = updatedLots.reduce((sum, lot) => sum + lot.quantityOnHand, 0);
        
        return {
          ...med,
          lots: updatedLots,
          totalQuantity: newTotal,
        };
      }));
    } catch (err) {
      setError('Failed to adjust stock');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dispenseMedication = useCallback(async (medicationId: string, lotId: string, amount: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const med = inventory.find(m => m.id === medicationId);
      if (!med) return false;
      
      const lot = med.lots.find(l => l.id === lotId);
      if (!lot || lot.quantityOnHand < amount) return false;
      
      setInventory(prev => prev.map(m => {
        if (m.id !== medicationId) return m;
        
        const updatedLots = m.lots.map(l => {
          if (l.id !== lotId) return l;
          return { ...l, quantityOnHand: l.quantityOnHand - amount };
        });
        
        const newTotal = updatedLots.reduce((sum, l) => sum + l.quantityOnHand, 0);
        
        return {
          ...m,
          lots: updatedLots,
          totalQuantity: newTotal,
        };
      }));
      
      return true;
    } catch (err) {
      setError('Failed to dispense medication');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [inventory]);

  const getLowStockItems = useCallback((): MedicationStock[] => {
    return inventory.filter(med => med.totalQuantity <= med.reorderPoint);
  }, [inventory]);

  const getExpiringLots = useCallback((days: number = 30): { medication: MedicationStock; lot: MedicationLot }[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const expiring: { medication: MedicationStock; lot: MedicationLot }[] = [];

    inventory.forEach(med => {
      med.lots.forEach(lot => {
        if (lot.expirationDate <= cutoff && lot.quantityOnHand > 0) {
          expiring.push({ medication: med, lot });
        }
      });
    });

    return expiring.sort((a, b) => a.lot.expirationDate.getTime() - b.lot.expirationDate.getTime());
  }, [inventory]);

  /**
   * Look up a medication lot by barcode/scan
   * Returns lot information with medication details
   */
  const getLotByBarcode = useCallback(async (barcode: string): Promise<{
    medicationId: string;
    lotId: string;
    lotNumber: string;
    medicationName: string;
    expirationDate?: string;
    unit?: string;
  } | null> => {
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      // Search through all medications and lots for matching barcode
      for (const med of inventory) {
        for (const lot of med.lots) {
          // Match by lot number
          if (lot.lotNumber.toLowerCase() === barcode.toLowerCase()) {
            return {
              medicationId: med.id,
              lotId: lot.id,
              lotNumber: lot.lotNumber,
              medicationName: med.name,
              expirationDate: lot.expirationDate.toLocaleDateString(),
              unit: lot.unitOfMeasure,
            };
          }

          // Also check if barcode contains the lot number (some scanners add prefixes/suffixes)
          const normalizedBarcode = barcode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const normalizedLot = lot.lotNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

          if (normalizedBarcode === normalizedLot ||
              normalizedBarcode.includes(normalizedLot) ||
              normalizedLot.includes(normalizedBarcode)) {
            return {
              medicationId: med.id,
              lotId: lot.id,
              lotNumber: lot.lotNumber,
              medicationName: med.name,
              expirationDate: lot.expirationDate.toLocaleDateString(),
              unit: lot.unitOfMeasure,
            };
          }
        }
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [inventory]);

  /**
   * Validate a lot for dispensing
   * Performs comprehensive validation including expiration, quantity, and status checks
   */
  const validateLotForDispensing = useCallback((lotId: string, quantity: number): LotValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let lot: MedicationLot | undefined;

    // Find the lot across all medications
    for (const med of inventory) {
      const foundLot = med.lots.find(l => l.id === lotId);
      if (foundLot) {
        lot = foundLot;
        break;
      }
    }

    // Check if lot exists
    if (!lot) {
      errors.push('Lot not found in inventory');
      return { valid: false, errors, warnings };
    }

    // Check expiration
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expirationDate = new Date(lot.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      errors.push(`This lot has expired on ${lot.expirationDate.toLocaleDateString()}. Cannot dispense.`);
    } else if (daysUntilExpiration < 30) {
      warnings.push(`Lot expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}. Consider using newer stock.`);
    } else if (daysUntilExpiration < 90) {
      warnings.push(`Lot expires in ${daysUntilExpiration} days.`);
    }

    // Check quantity
    if (lot.quantityOnHand < quantity) {
      errors.push(`Insufficient quantity. Available: ${lot.quantityOnHand} ${lot.unitOfMeasure}, Requested: ${quantity} ${lot.unitOfMeasure}`);
    }

    // Check if lot is depleted
    if (lot.quantityOnHand <= 0) {
      errors.push('This lot has been depleted and is not available for dispensing.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      lot,
    };
  }, [inventory]);

  /**
   * Get available lots for a medication using FEFO (First Expire First Out) ordering
   * Filters out expired and depleted lots, and provides expiration warnings
   */
  const getAvailableLots = useCallback((medicationId: string): AvailableLot[] => {
    const med = inventory.find(m => m.id === medicationId);
    if (!med) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return med.lots
      .filter(lot => {
        // Filter out depleted lots
        if (lot.quantityOnHand <= 0) return false;

        // Filter out expired lots
        const expirationDate = new Date(lot.expirationDate);
        expirationDate.setHours(0, 0, 0, 0);
        return expirationDate >= today;
      })
      .map(lot => {
        const expirationDate = new Date(lot.expirationDate);
        expirationDate.setHours(0, 0, 0, 0);
        const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let expirationWarning: string | undefined;
        if (daysUntilExpiration < 30) {
          expirationWarning = `Expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}`;
        } else if (daysUntilExpiration < 90) {
          expirationWarning = `Expires in ${daysUntilExpiration} days`;
        }

        return {
          ...lot,
          medicationName: med.name,
          daysUntilExpiration,
          expirationWarning,
          isExpiringSoon: daysUntilExpiration < 90,
          isExpired: daysUntilExpiration < 0,
        };
      })
      .sort((a, b) => {
        // FEFO: First Expire First Out - sort by expiration date ascending
        return a.expirationDate.getTime() - b.expirationDate.getTime();
      });
  }, [inventory]);

  /**
   * Get lot by ID across all medications
   */
  const getLotById = useCallback((lotId: string): { lot: MedicationLot; medication: MedicationStock } | null => {
    for (const med of inventory) {
      const lot = med.lots.find(l => l.id === lotId);
      if (lot) {
        return { lot, medication: med };
      }
    }
    return null;
  }, [inventory]);

  /**
   * Validate multiple lots for dispensing (batch validation)
   */
  const validateLotsForDispensing = useCallback((items: Array<{ lotId: string; quantity: number }>): Array<LotValidationResult & { lotId: string }> => {
    return items.map(item => ({
      lotId: item.lotId,
      ...validateLotForDispensing(item.lotId, item.quantity),
    }));
  }, [validateLotForDispensing]);

  /**
   * Refresh inventory from the backend
   * Call this after loading seed data or logging in
   */
  const loadInventory = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      if (window.electron?.inventory?.search) {
        // Use search API with empty string to get all inventory
        const result = await window.electron.inventory.search({ pageSize: 1000 }) as any;
        if (result?.data) {
          const stockList = transformInventoryToStock(result.data);
          setInventory(stockList);
          console.log('[useInventory] Refreshed', stockList.length, 'medications');
        }
      } else if (window.electron?.inventory?.getAllLots) {
        const result = await window.electron.inventory.getAllLots({ pageSize: 1000 }) as any;
        if (result?.data) {
          const stockList = transformInventoryToStock(result.data);
          setInventory(stockList);
        }
      }
    } catch (err) {
      console.error('Failed to refresh inventory:', err);
      setError('Failed to refresh inventory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get lots that are expiring within a specified timeframe
   */
  const getLotsExpiringWithin = useCallback((days: number): Array<{ lot: MedicationLot; medication: MedicationStock }> => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    cutoff.setHours(23, 59, 59, 999);

    const expiringLots: Array<{ lot: MedicationLot; medication: MedicationStock }> = [];

    inventory.forEach(med => {
      med.lots.forEach(lot => {
        if (lot.expirationDate <= cutoff && lot.quantityOnHand > 0) {
          expiringLots.push({ lot, medication: med });
        }
      });
    });

    // Sort by expiration date
    return expiringLots.sort((a, b) => a.lot.expirationDate.getTime() - b.lot.expirationDate.getTime());
  }, [inventory]);

  return {
    inventory,
    isLoading,
    error,
    getAllMedications,
    getMedicationById,
    searchMedications,
    getLotsForMedication,
    receiveStock,
    adjustStock,
    dispenseMedication,
    getLowStockItems,
    getExpiringLots,
    getLotByBarcode,
    loadInventory,
    // New lot validation functions
    validateLotForDispensing,
    getAvailableLots,
    getLotById,
    validateLotsForDispensing,
    getLotsExpiringWithin,
  };
}
