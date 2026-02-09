import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, Package, TrendingDown, Calendar, CheckCircle, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: number;
  name: string;
  role: string;
}

interface InventoryItem {
  id: number;
  medication_name: string;
  generic_name: string;
  lot_number: string;
  expiration_date: string;
  quantity_received: number;
  quantity_remaining: number;
  date_received: string;
}

interface InventoryDashboardItem {
  medication_id: number;
  medication_name: string;
  generic_name: string;
  total_quantity: number;
  active_lots: number;
  earliest_expiration: string;
}

interface Alert {
  id: number;
  alert_type: string;
  message: string;
  medication_name: string;
  lot_number: string;
  expiration_date: string;
  quantity_remaining: number;
}

interface InventoryProps {
  user: User;
}

export const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'alerts' | 'receive'>('dashboard');
  const [dashboardData, setDashboardData] = useState<InventoryDashboardItem[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [medications, setMedications] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Receive form state
  const [receiveForm, setReceiveForm] = useState({
    medication_id: 0,
    lot_number: '',
    expiration_date: '',
    quantity_received: 1,
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    loadMedications();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashboard, inventory, alertsData] = await Promise.all([
        window.electron.inventory.getDashboard(),
        window.electron.inventory.getAll(),
        window.electron.alerts.get(false),
      ]);
      setDashboardData(dashboard as InventoryDashboardItem[]);
      setInventoryData(inventory as InventoryItem[]);
      setAlerts(alertsData as Alert[]);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedications = async () => {
    try {
      const meds = await window.electron.medication.getAll();
      setMedications((meds as any[]).map((m) => ({ id: m.id, name: m.name })));
    } catch (err) {
      console.error('Error loading medications:', err);
    }
  };

  const handleReceive = async () => {
    if (!receiveForm.medication_id || !receiveForm.lot_number || !receiveForm.expiration_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await window.electron.inventory.receive({
        ...receiveForm,
        date_received: format(new Date(), 'yyyy-MM-dd'),
        received_by: user.id,
      });

      // Reset form
      setReceiveForm({
        medication_id: 0,
        lot_number: '',
        expiration_date: '',
        quantity_received: 1,
        supplier: '',
        notes: '',
      });

      loadData();
      setActiveTab('dashboard');
      alert('Inventory received successfully');
    } catch (err) {
      console.error('Error receiving inventory:', err);
      alert('Error receiving inventory. Please try again.');
    }
  };

  const resolveAlert = async (alertId: number) => {
    try {
      await window.electron.alerts.resolve(alertId, user.id);
      loadData();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Medication', 'Generic Name', 'Lot #', 'Expiration', 'Qty Received', 'Qty Remaining', 'Date Received'];
    const rows = inventoryData.map((item) => [
      item.medication_name,
      item.generic_name,
      item.lot_number,
      item.expiration_date,
      item.quantity_received,
      item.quantity_remaining,
      item.date_received,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'expiring_30':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'low_stock':
        return <TrendingDown className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'expired':
        return 'bg-red-50 border-red-200';
      case 'expiring_30':
        return 'bg-orange-50 border-orange-200';
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-1 flex gap-1">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Package },
          { id: 'inventory', label: 'All Inventory', icon: Package },
          { id: 'alerts', label: `Alerts ${alerts.length > 0 ? `(${alerts.length})` : ''}`, icon: AlertCircle },
          { id: 'receive', label: 'Receive Stock', icon: Plus },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
          ) : dashboardData.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">No inventory data available</div>
          ) : (
            dashboardData.map((item) => (
              <div key={item.medication_id} className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-medium text-gray-900">{item.medication_name}</h3>
                <p className="text-sm text-gray-500">{item.generic_name}</p>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Quantity:</span>
                    <span className="font-medium">{item.total_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Active Lots:</span>
                    <span className="font-medium">{item.active_lots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Earliest Expiration:</span>
                    <span className={`font-medium ${
                      item.earliest_expiration && new Date(item.earliest_expiration) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'text-red-600'
                        : ''
                    }`}>
                      {item.earliest_expiration || 'N/A'}
                    </span>
                  </div>
                </div>

                {item.total_quantity < 30 && (
                  <div className="mt-4 p-2 bg-yellow-50 text-yellow-800 text-sm rounded">
                    Low stock warning
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">All Inventory Items</h3>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventoryData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.medication_name}</div>
                    <div className="text-xs text-gray-500">{item.generic_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.lot_number}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={new Date(item.expiration_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                      {item.expiration_date}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.date_received}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={item.quantity_remaining < 10 ? 'text-red-600 font-medium' : ''}>
                      {item.quantity_remaining}
                    </span>
                    <span className="text-gray-400 text-xs"> / {item.quantity_received}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p>No active alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getAlertColor(alert.alert_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <h4 className="font-medium text-gray-900">{alert.medication_name}</h4>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      {alert.lot_number && (
                        <p className="text-xs text-gray-500 mt-1">
                          Lot: {alert.lot_number}
                          {alert.quantity_remaining !== undefined && ` | Qty: ${alert.quantity_remaining}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Receive Tab */}
      {activeTab === 'receive' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Receive New Stock</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medication *</label>
              <select
                value={receiveForm.medication_id}
                onChange={(e) => setReceiveForm({ ...receiveForm, medication_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Select medication...</option>
                {medications.map((med) => (
                  <option key={med.id} value={med.id}>{med.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lot Number *</label>
              <input
                type="text"
                value={receiveForm.lot_number}
                onChange={(e) => setReceiveForm({ ...receiveForm, lot_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter lot number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date *</label>
              <input
                type="date"
                value={receiveForm.expiration_date}
                onChange={(e) => setReceiveForm({ ...receiveForm, expiration_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Received *</label>
              <input
                type="number"
                min={1}
                value={receiveForm.quantity_received}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity_received: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <input
                type="text"
                value={receiveForm.supplier}
                onChange={(e) => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <input
                type="text"
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleReceive}
              disabled={!receiveForm.medication_id || !receiveForm.lot_number || !receiveForm.expiration_date}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Receive Stock
            </button>
            <button
              onClick={() => setReceiveForm({
                medication_id: 0,
                lot_number: '',
                expiration_date: '',
                quantity_received: 1,
                supplier: '',
                notes: '',
              })}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
