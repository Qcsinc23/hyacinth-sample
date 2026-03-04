import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, UserX, UserCheck, X } from 'lucide-react';

interface StaffRecord {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'dispenser', label: 'Dispenser' },
];

export const StaffManagementPanel: React.FC = () => {
  const [list, setList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    pin: '',
    role: 'dispenser' as 'admin' | 'dispenser',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!window.electron?.staff?.getAll) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.electron.staff.getAll(showInactive) as StaffRecord[];
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAdd = () => {
    setEditingId(null);
    setForm({ first_name: '', last_name: '', pin: '', role: 'dispenser' });
    setFormError(null);
    setShowForm(true);
  };

  const handleEdit = (row: StaffRecord) => {
    setEditingId(row.id);
    setForm({
      first_name: row.first_name,
      last_name: row.last_name,
      pin: '', // never send existing PIN to client
      role: row.role as 'admin' | 'dispenser',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    if (!editingId && !form.pin) {
      setFormError('PIN is required for new staff.');
      return;
    }
    if (form.pin && form.pin.length < 4) {
      setFormError('PIN must be at least 4 characters.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload: { first_name?: string; last_name?: string; role?: string; pin?: string } = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: form.role,
        };
        if (form.pin) payload.pin = form.pin;
        await window.electron?.staff?.update?.(editingId, payload);
      } else {
        await window.electron?.staff?.add?.({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          pin: form.pin,
          role: form.role,
        });
      }
      handleCloseForm();
      loadStaff();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this staff member? They will not be able to log in.')) return;
    try {
      await window.electron?.staff?.deactivate?.(id);
      loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deactivate failed');
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await window.electron?.staff?.reactivate?.(id);
      loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reactivate failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Staff Members</h3>
            <p className="text-sm text-gray-500">Manage who can log in and their roles</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last login</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((row) => (
                  <tr key={row.id} className={!row.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{row.role}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {row.last_login_at
                        ? new Date(row.last_login_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.is_active ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="p-1.5 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivate(row.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600"
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(row.id)}
                          className="p-1.5 text-gray-500 hover:text-green-600"
                          title="Reactivate"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button type="button" onClick={handleCloseForm} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingId ? 'New PIN (leave blank to keep current)' : 'PIN'}
                </label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'dispenser' }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
