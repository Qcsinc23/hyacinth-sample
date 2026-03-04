import { useState, useCallback } from 'react';

interface FormConfig<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>(config: FormConfig<T>) {
  const { initialValues, validate, onSubmit } = config;
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateField = useCallback((name: keyof T, value: any): string | undefined => {
    if (!validate) return undefined;
    const validationErrors = validate({ ...values, [name]: value });
    return validationErrors[name];
  }, [validate, values]);

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const touchField = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }
    
    setValue(name as keyof T, parsedValue);
  }, [setValue]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    touchField(e.target.name as keyof T);
  }, [touchField]);

  const validateAll = useCallback((): boolean => {
    if (!validate) return true;
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return Object.keys(validationErrors).length === 0;
  }, [validate, values]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateAll()) {
      return;
    }

    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
        setSubmitSuccess(true);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [validateAll, onSubmit, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [initialValues]);

  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': errors[name] ? 'true' : 'false',
    'aria-describedby': errors[name] ? `${String(name)}-error` : undefined,
  }), [values, handleChange, handleBlur, errors]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    submitSuccess,
    setValue,
    setFieldValue,
    touchField,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
    validateAll,
    isValid: Object.keys(errors).length === 0,
  };
}
