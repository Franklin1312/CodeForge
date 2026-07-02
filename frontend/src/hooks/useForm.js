import { useState, useCallback } from "react";

/**
 * Generic form validation hook.
 *
 * Usage:
 *   const { values, errors, handleChange, handleSubmit, setFieldError } = useForm({
 *     initialValues: { email: "", password: "" },
 *     validators: {
 *       email: (v) => !v ? "Required" : !/\S+@\S+/.test(v) ? "Invalid email" : null,
 *       password: (v) => !v ? "Required" : v.length < 8 ? "Too short" : null,
 *     },
 *     onSubmit: async (values) => { ... }
 *   });
 */
export function useForm({ initialValues, validators = {}, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setValues((v) => ({ ...v, [name]: newValue }));
    // Clear error on change
    setErrors((e) => ({ ...e, [name]: null }));
  }, []);

  const validateAll = useCallback(() => {
    const errs = {};
    let hasErrors = false;
    for (const [field, validator] of Object.entries(validators)) {
      const error = validator(values[field], values);
      if (error) {
        errs[field] = error;
        hasErrors = true;
      }
    }
    setErrors(errs);
    return !hasErrors;
  }, [values, validators]);

  const setFieldError = useCallback((field, message) => {
    setErrors((e) => ({ ...e, [field]: message }));
  }, []);

  const setServerErrors = useCallback((apiErrors = []) => {
    const errs = {};
    apiErrors.forEach(({ field, message }) => { errs[field] = message; });
    setErrors(errs);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!validateAll()) return;
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateAll, onSubmit, values]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldError,
    setServerErrors,
    reset,
    setValues,
  };
}

export default useForm;
