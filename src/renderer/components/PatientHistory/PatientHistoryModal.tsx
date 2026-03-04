import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  History, 
  Pill, 
  AlertCircle, 
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  Activity
} from 'lucide-react';
import { Button } from '../common/Button';
import type { 
  PatientDispensingHistory,
  PatientMedicationSummary,
  MedicationTimelineEvent
} from '../../../main/database/queries/patients';
import type { Patient } from '../../types';
import { sanitizeInput } from '../../utils/sanitize';

interface PatientHistoryModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

type HistoryTab = 'overview' | 'timeline' | 'medications';

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({ 
  patient, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>('overview');
  const [history, setHistory] = useState<PatientDispensingHistory[]>([]);
  const [medicationSummary, setMedicationSummary] = useState<PatientMedicationSummary[]>([]);
  const [timeline, setTimeline] = useState<MedicationTimelineEvent[]>([]);
  const [lastDispensed, setLastDispensed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient && isOpen) {
      loadPatientHistory();
    }
  }, [patient, isOpen]);

  const loadPatientHistory = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      if (!window.electron?.patient) {
        throw new Error('Patient API is not available');
      }
      const patientApi = window.electron.patient;
      const pid = parseInt(patient.id);
      const [historyData, summaryData, timelineData, lastDate] = await Promise.all([
        patientApi.getDispensingHistory(pid),
        patientApi.getMedicationSummary(pid),
        patientApi.getMedicationTimeline(pid),
        patientApi.getLastDispensedDate(pid),
      ]);
      setHistory(historyData);
      setMedicationSummary(summaryData);
      setTimeline(timelineData);
      setLastDispensed(lastDate);
    } catch (error) {
      console.error('Error loading patient history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'voided':
        return 'bg-red-100 text-red-700';
      case 'corrected':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {sanitizeInput(patient.firstName)} {sanitizeInput(patient.lastName)}
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Chart: {sanitizeInput(patient.chartNumber)} • DOB: {patient.dateOfBirth.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Allergy Warning */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="mt-4 bg-red-500/20 border border-red-400/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Allergies:</span>
                  <span>{patient.allergies.map(a => sanitizeInput(a)).join(', ')}</span>
                </div>
              </div>
            )}

            {/* Last Dispensed */}
            {lastDispensed && (
              <div className="mt-3 flex items-center gap-2 text-blue-100 text-sm">
                <Clock className="w-4 h-4" />
                <span>Last dispensed: {formatDate(lastDispensed)}</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="w-4 h-4" />
                Timeline
                {timeline.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {timeline.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('medications')}
                className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'medications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Pill className="w-4 h-4" />
                Medications
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading patient history...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <History className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Dispenses</p>
                            <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Pill className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Unique Medications</p>
                            <p className="text-2xl font-bold text-gray-900">{medicationSummary.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Last 30 Days</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {history.filter(h => {
                                const date = new Date(h.dispensingDate);
                                const thirtyDaysAgo = new Date();
                                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                return date >= thirtyDaysAgo;
                              }).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Dispenses */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Recent Dispenses</h4>
                      {history.slice(0, 5).map((record, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded">
                              <Calendar className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(record.dispensingDate)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.medications.map(m => sanitizeInput(m)).join(', ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(record.status)}`}>
                              {record.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                      {history.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No dispensing history found.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {timeline.map((event, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {idx < timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{sanitizeInput(event.medicationName)}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {formatDate(event.date)} at {formatTime(event.time)}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(event.status)}`}>
                                {event.status}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Amount</p>
                                <p className="font-medium text-gray-900">{sanitizeInput(event.amount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Reason</p>
                                <p className="font-medium text-gray-900">{sanitizeInput(event.reason) || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">By</p>
                                <p className="font-medium text-gray-900">{sanitizeInput(event.staffName)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {timeline.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No timeline events found.</p>
                    )}
                  </div>
                )}

                {activeTab === 'medications' && (
                  <div className="space-y-4">
                    {medicationSummary.map((med, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{sanitizeInput(med.medicationName)}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Dispensed {med.totalDispenses} times
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Last dispensed</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(med.lastDispensed)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Average Quantity</p>
                            <p className="font-medium text-gray-900">
                              {med.averageQuantity.toFixed(2)}
                            </p>
                          </div>
                          {med.adherenceScore !== undefined && (
                            <div>
                              <p className="text-sm text-gray-500">Adherence Score</p>
                              <p className={`font-medium ${
                                med.adherenceScore >= 80 ? 'text-green-600' : 
                                med.adherenceScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {med.adherenceScore}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {medicationSummary.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No medication history found.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {history.length} total dispensing records
              </p>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHistoryModal;