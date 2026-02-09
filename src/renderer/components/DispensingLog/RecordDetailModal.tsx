import React from 'react';
import { X, Clock, User, Pill, FileText, CheckCircle2, AlertCircle, XCircle, History } from 'lucide-react';
import { Button } from '../common/Button';
import type { DispenseRecord, RecordStatus } from '../../types';

interface RecordDetailModalProps {
  record: DispenseRecord | null;
  onClose: () => void;
}

const statusIcons: Record<RecordStatus, React.ReactNode> = {
  active: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  corrected: <AlertCircle className="h-5 w-5 text-amber-600" />,
  voided: <XCircle className="h-5 w-5 text-red-600" />,
};

const statusLabels: Record<RecordStatus, string> = {
  active: 'Active',
  corrected: 'Corrected',
  voided: 'Voided',
};

const statusStyles: Record<RecordStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  corrected: 'bg-amber-100 text-amber-800',
  voided: 'bg-red-100 text-red-800',
};

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusStyles[record.status]}`}>
                {statusIcons[record.status]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Dispensing Record
                </h3>
                <p className="text-sm text-gray-500">
                  Record ID: {record.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Patient Info */}
          <section className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              Patient Information
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Patient Name</p>
                  <p className="font-medium text-gray-900">{record.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Chart Number</p>
                  <p className="font-medium text-gray-900">{record.patientChartNumber}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Medications */}
          <section className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Pill className="h-4 w-4 text-gray-400" />
              Dispensed Medications
            </h4>
            <div className="space-y-3">
              {record.medications.map((med) => (
                <div key={med.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Medication</p>
                      <p className="font-medium text-gray-900">{med.medicationName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-900">{med.amount} {med.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lot Number</p>
                      <p className="font-medium text-gray-900">{med.lotNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expiration</p>
                      <p className="font-medium text-gray-900">
                        {med.expirationDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Dispensing Info */}
          <section className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              Dispensing Details
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Dispensed By</p>
                  <p className="font-medium text-gray-900">{record.dispensedByName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date/Time</p>
                  <p className="font-medium text-gray-900">
                    {record.dispensedAt.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {record.reasons.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reasons</p>
                  <div className="flex flex-wrap gap-2">
                    {record.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {record.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{record.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Audit Trail */}
          <section>
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              Audit Trail
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                <div>
                  <p className="font-medium text-gray-900">Record Created</p>
                  <p className="text-gray-500">
                    By {record.dispensedByName} on {record.dispensedAt.toLocaleString()}
                  </p>
                </div>
              </div>

              {record.correction && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5" />
                  <div>
                    <p className="font-medium text-gray-900">Record Corrected</p>
                    <p className="text-gray-500">
                      By {record.correction.correctedByName} on {record.correction.correctedAt.toLocaleString()}
                    </p>
                    <p className="text-gray-600 mt-1">Reason: {record.correction.reason}</p>
                  </div>
                </div>
              )}

              {record.void && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <div>
                    <p className="font-medium text-gray-900">Record Voided</p>
                    <p className="text-gray-500">
                      By {record.void.voidedByName} on {record.void.voidedAt.toLocaleString()}
                    </p>
                    <p className="text-gray-600 mt-1">Reason: {record.void.reason}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;
