import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

interface PatientAllergyWarningsProps {
  allergies: string[];
  severity?: 'high' | 'medium' | 'low';
  onDismiss?: () => void;
  compact?: boolean;
  inline?: boolean;
}

export const PatientAllergyWarnings: React.FC<PatientAllergyWarningsProps> = ({
  allergies,
  severity = 'high',
  onDismiss,
  compact = false,
  inline = false,
}) => {
  if (!allergies || allergies.length === 0) {
    return null;
  }

  const getSeverityStyles = () => {
    switch (severity) {
      case 'high':
        return {
          container: 'bg-red-50 border-red-400',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-700',
        };
      case 'medium':
        return {
          container: 'bg-orange-50 border-orange-400',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          text: 'text-orange-800',
          badge: 'bg-orange-100 text-orange-700',
        };
      case 'low':
        return {
          container: 'bg-yellow-50 border-yellow-400',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-700',
        };
    }
  };

  const styles = getSeverityStyles();

  if (inline) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${styles.badge}`}>
        <AlertTriangle className="w-3 h-3" />
        <span className="text-xs font-medium">
          {allergies.length} allergy{allergies.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`rounded-lg border-l-4 p-3 ${styles.container}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${styles.icon}`} />
          <span className={`text-sm font-semibold ${styles.title}`}>
            Allergies: {allergies.join(', ')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full bg-white/50 ${styles.icon}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className={`font-semibold ${styles.title}`}>
              Patient Allergies ({allergies.length})
            </h4>
            <p className={`mt-1 text-sm ${styles.text}`}>
              This patient has the following documented allergies:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {allergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles.badge}`}
                >
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1 rounded hover:bg-white/50 transition-colors ${styles.icon}`}
            aria-label="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Additional warning for high severity */}
      {severity === 'high' && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-sm text-red-700">
            <strong>⚠️ Important:</strong> Please verify all medications before dispensing. 
            Cross-check against allergy list.
          </p>
        </div>
      )}
    </div>
  );
};

interface PatientAllergyCheckProps {
  patientAllergies: string[];
  medicationIngredients: string[];
  medicationName: string;
}

/**
 * Component to check if a medication might conflict with patient allergies
 */
export const AllergyConflictCheck: React.FC<PatientAllergyCheckProps> = ({
  patientAllergies,
  medicationIngredients,
  medicationName,
}) => {
  // Simple string matching - in a real app, you'd use a more sophisticated algorithm
  const potentialConflicts = patientAllergies.filter(allergy =>
    medicationIngredients.some(ingredient =>
      ingredient.toLowerCase().includes(allergy.toLowerCase()) ||
      allergy.toLowerCase().includes(ingredient.toLowerCase())
    )
  );

  const hasConflict = potentialConflicts.length > 0;

  if (!hasConflict) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>No known allergy conflicts</span>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">Potential Allergy Conflict Detected</p>
          <p className="text-sm text-red-700 mt-1">
            <strong>{medicationName}</strong> may contain substances the patient is allergic to:
          </p>
          <ul className="mt-2 list-disc list-inside text-sm text-red-700">
            {potentialConflicts.map((conflict, idx) => (
              <li key={idx}>{conflict}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-semibold text-red-800">
            Please verify before dispensing.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper icon component for missing import
const CheckCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default PatientAllergyWarnings;