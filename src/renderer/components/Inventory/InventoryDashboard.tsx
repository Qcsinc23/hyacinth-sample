import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
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

  const stats = [
    {
      label: 'Total Medications',
      value: inventory.length,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Low Stock Alerts',
      value: lowStockItems.length,
      icon: TrendingDown,
      color: lowStockItems.length > 0 ? 'bg-red-500' : 'bg-emerald-500',
    },
    {
      label: 'Expiring Soon',
      value: expiringLots.length,
      icon: Clock,
      color: expiringLots.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
    },
    {
      label: 'Critical Alerts',
      value: lowStockItems.filter(i => i.totalQuantity === 0).length + expiringLots.filter(l => l.lot.expirationDate < new Date()).length,
      icon: AlertTriangle,
      color: 'bg-red-600',
    },
  ];

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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading ? '-' : stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Panel */}
      <AlertPanel />

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
