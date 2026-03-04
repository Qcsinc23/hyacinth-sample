import React from 'react';
import { Printer, Save, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

interface FormActionsProps {
  onSaveAndPrint: () => void;
  onSaveOnly: () => void;
  onReset: () => void;
  isLoading?: boolean;
  isValid?: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onSaveAndPrint,
  onSaveOnly,
  onReset,
  isLoading = false,
  isValid = true,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <Button
        variant="ghost"
        onClick={onReset}
        disabled={isLoading}
        leftIcon={<RotateCcw className="h-4 w-4" />}
      >
        Reset Form
      </Button>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onSaveOnly}
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Only
        </Button>
        
        <Button
          onClick={onSaveAndPrint}
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          leftIcon={<Printer className="h-4 w-4" />}
        >
          Save & Print
        </Button>
      </div>
    </div>
  );
};

export default FormActions;
