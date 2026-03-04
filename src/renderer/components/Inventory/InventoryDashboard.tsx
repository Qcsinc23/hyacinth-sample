import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Clock } from 'lucide-react';
import { StockTable } from './StockTable';
import { AlertPanel } from './AlertPanel';
import { ReceiveStockForm } from './ReceiveStockForm';
import { useInventory } from '../../hooks/useInventory';
import type { MedicationStock } from '../../types';

export const InventoryDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'receive'>('overview');
  const [inventory, setInventory] = useState<MedicationStock[]>([]);
  const { getAllMedications, getLowStockItems, getExpiringLots, isLoading } = useInventory();

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const meds = await getAllMedications();
    setInventory(meds);
  };

  const lowStockItems = getLowStockItems();
  const expiringLots = getExpiringLots(30);

  if (activeView === 'receive') {
    return (
      <ReceiveStockForm
        onComplete={() => {
          loadInventory();
          setActiveView('overview');
        }}
        onCancel={() => setActiveView('overview')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact summary bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-blue-500" />
          <span className="text-gray-500">Medications:</span>
          <span className="font-semibold text-gray-900">{isLoading ? '—' : inventory.length}</span>
        </div>
        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-red-600 font-medium">{lowStockItems.length} low stock</span>
          </div>
        )}
        {expiringLots.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-amber-600 font-medium">{expiringLots.length} expiring soon</span>
          </div>
        )}
        {lowStockItems.length === 0 && expiringLots.length === 0 && !isLoading && (
          <span className="text-sm text-emerald-600 font-medium">All clear</span>
        )}
      </div>

      {/* Alerts panel (only when there are alerts) */}
      {(lowStockItems.length > 0 || expiringLots.length > 0) && <AlertPanel />}

      {/* Stock Table */}
      <StockTable
        inventory={inventory}
        isLoading={isLoading}
        onReceiveClick={() => setActiveView('receive')}
        onRefresh={loadInventory}
      />
    </div>
  );
};

export default InventoryDashboard;
