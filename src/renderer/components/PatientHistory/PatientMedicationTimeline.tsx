import React from 'react';
import { 
  Clock, 
  Pill, 
  User,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import type { MedicationTimelineEvent } from '../../../main/database/queries/patients';

interface PatientMedicationTimelineProps {
  timeline: MedicationTimelineEvent[];
  compact?: boolean;
}

export const PatientMedicationTimeline: React.FC<PatientMedicationTimelineProps> = ({ 
  timeline,
  compact = false 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'voided':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'corrected':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'voided':
        return 'bg-red-100 border-red-300';
      case 'corrected':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  // Group events by date
  const groupedByDate = timeline.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, MedicationTimelineEvent[]>);

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No medication history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="relative">
          {/* Date Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h4>
            <span className="text-sm text-gray-500">
              ({groupedByDate[date].length} event{groupedByDate[date].length !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Events for this date */}
          <div className="ml-5 pl-6 border-l-2 border-gray-200 space-y-3">
            {groupedByDate[date].map((event, idx) => (
              <div
                key={idx}
                className={`relative p-4 rounded-lg border ${getStatusColor(event.status)} ${
                  compact ? 'text-sm' : ''
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-4 w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{event.medicationName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(event.status)}
                    <span className="text-xs text-gray-500">{event.time}</span>
                  </div>
                </div>

                <div className={`mt-2 grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-sm`}>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <span className="ml-1 font-medium">{event.amount}</span>
                  </div>
                  {!compact && (
                    <div>
                      <span className="text-gray-500">Reason:</span>
                      <span className="ml-1 font-medium">{event.reason || 'N/A'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600">{event.staffName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PatientMedicationTimeline;