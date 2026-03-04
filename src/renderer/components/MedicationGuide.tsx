import React, { useState, useEffect } from 'react';
import { Search, BookOpen, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Medication {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  strength: string;
  dosing_instructions: string;
  indications: string;
  side_effects: string;
  contraindications: string;
}

export const MedicationGuide: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      if (!window.electron?.medication?.getAll) {
        throw new Error('Medication API is not available');
      }
      const meds = await window.electron.medication.getAll();
      setMedications(meds as Medication[]);
    } catch (err) {
      console.error('Error loading medications:', err);
    }
  };

  const categories = Array.from(new Set(medications.map((m) => m.category)));

  const filteredMedications = medications.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.indications.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter || med.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-lg shadow-sm flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredMedications.map((med) => (
            <button
              key={med.id}
              onClick={() => setSelectedMedication(med)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedMedication?.id === med.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <h4 className="font-medium text-gray-900">{med.name}</h4>
              <p className="text-sm text-gray-500">{med.generic_name}</p>
              <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {med.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-white rounded-lg shadow-sm p-6 overflow-auto">
        {selectedMedication ? (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedMedication.name}</h2>
                  <p className="text-lg text-gray-600 mt-1">{selectedMedication.generic_name}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {selectedMedication.category}
                </span>
              </div>
              <div className="flex gap-4 mt-4 text-sm text-gray-500">
                <span><strong>Form:</strong> {selectedMedication.dosage_form}</span>
                <span><strong>Strength:</strong> {selectedMedication.strength}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Dosing Instructions</h3>
                </div>
                <p className="text-gray-700">{selectedMedication.dosing_instructions}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">Indications</h3>
                </div>
                <p className="text-gray-700">{selectedMedication.indications}</p>
              </div>

              {selectedMedication.side_effects && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-medium text-gray-900">Side Effects</h3>
                  </div>
                  <p className="text-gray-700">{selectedMedication.side_effects}</p>
                </div>
              )}

              {selectedMedication.contraindications && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-gray-900">Contraindications</h3>
                  </div>
                  <p className="text-gray-700">{selectedMedication.contraindications}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <BookOpen className="w-16 h-16 mb-4" />
            <p className="text-lg">Select a medication to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
