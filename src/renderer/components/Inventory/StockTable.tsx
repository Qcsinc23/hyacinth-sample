import React, { useState } from 'react';
import { Package, Plus, RefreshCw, Edit2 } from 'lucide-react';
import { Button } from '../common/Button';
import type { MedicationStock, MedicationLot } from '../../types';
import { AdjustStockModal } from './AdjustStockModal';

interface StockTableProps {
  inventory: MedicationStock[];
  isLoading: boolean;
  onReceiveClick: () => void;
  onRefresh: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  inventory,
  isLoading,
  onReceiveClick,
  onRefresh,
}) => {
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [adjustMed, setAdjustMed] = useState<MedicationStock | null>(null);
  const [adjustLot, setAdjustLot] = useState<MedicationLot | null>(null);

  const getStockStatus = (med: MedicationStock) => {
    if (med.totalQuantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (med.totalQuantity <= med.reorderPoint) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' };
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-800' };
  };

  const getLotStatus = (lot: MedicationLot) => {
    const daysUntil = Math.ceil((lot.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 30) return { label: `${daysUntil}d`, color: 'bg-amber-100 text-amber-800' };
    return { label: 'Good', color: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Current Inventory</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={onReceiveClick}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Receive Stock
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medication
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lots
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No medications in inventory
                </td>
              </tr>
            ) : (
              inventory.map((med) => {
                const status = getStockStatus(med);
                const isExpanded = expandedMed === med.id;

                return (
                  <React.Fragment key={med.id}>
                    <tr
                      className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
                      onClick={() => setExpandedMed(isExpanded ? null : med.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{med.name}</p>
                          {med.genericName && (
                            <p className="text-xs text-gray-500">{med.genericName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {med.category}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${med.totalQuantity <= med.reorderPoint ? 'text-red-600' : 'text-gray-900'}`}>
                          {med.totalQuantity}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">/ {med.reorderPoint} min</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {med.lots.length} lot(s)
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdjustMed(med);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Lots View */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50">
                          <div className="ml-8 space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Lot Details</h4>
                            {med.lots.map((lot) => {
                              const lotStatus = getLotStatus(lot);
                              return (
                                <div
                                  key={lot.id}
                                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                                >
                                  <div className="grid grid-cols-4 gap-4 flex-1">
                                    <div>
                                      <p className="text-xs text-gray-500">Lot #</p>
                                      <p className="font-medium text-gray-900">{lot.lotNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Quantity</p>
                                      <p className="font-medium text-gray-900">{lot.quantityOnHand} {lot.unitOfMeasure}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Expiration</p>
                                      <p className="font-medium text-gray-900">{lot.expirationDate.toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Status</p>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${lotStatus.color}`}>
                                        {lotStatus.label}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setAdjustMed(med);
                                      setAdjustLot(lot);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Stock Modal */}
      {adjustMed && (
        <AdjustStockModal
          medication={adjustMed}
          lot={adjustLot}
          onClose={() => {
            setAdjustMed(null);
            setAdjustLot(null);
          }}
          onAdjust={() => {
            onRefresh();
            setAdjustMed(null);
            setAdjustLot(null);
          }}
        />
      )}
    </div>
  );
};

export default StockTable;
