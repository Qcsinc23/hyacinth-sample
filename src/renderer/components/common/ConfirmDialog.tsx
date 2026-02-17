import React from 'react';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  warning?: boolean;
  info?: boolean;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Reusable confirmation dialog for destructive actions
 * 
 * Usage:
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this?"
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 *   danger
 * />
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  warning = false,
  isLoading = false,
  confirmDisabled = false,
  children,
}) => {
  if (!isOpen) return null;

  // Determine icon and colors based on variant
  const getVariantStyles = () => {
    if (danger) {
      return {
        icon: AlertTriangle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        buttonVariant: 'danger' as const,
      };
    }
    if (warning) {
      return {
        icon: AlertCircle,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        buttonVariant: 'warning' as const,
      };
    }
    return {
      icon: Info,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonVariant: 'primary' as const,
    };
  };

  const styles = getVariantStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`${styles.iconBg} p-2.5 rounded-lg`}>
                <IconComponent className={`h-6 w-6 ${styles.iconColor}`} />
              </div>
              <h3 
                id="confirm-dialog-title" 
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-gray-600 leading-relaxed">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>
          
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={styles.buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={confirmDisabled || isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
