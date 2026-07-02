/**
 * Extracts a user-friendly error message from an Axios error response.
 * Works with the normalized error shape from our backend:
 *   { error: { code, message, details?: [{ field, message }] } }
 */
export function parseApiError(err) {
  const data = err?.response?.data?.error;
  if (!data) return err?.message || "An unexpected error occurred";
  return data.message || "Something went wrong";
}

/**
 * Extracts field-level validation errors from an Axios error response.
 * Returns an object keyed by field name: { email: "Invalid email", ... }
 */
export function parseFieldErrors(err) {
  const details = err?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  const fieldErrors = {};
  details.forEach(({ field, message }) => {
    if (field && message) fieldErrors[field] = message;
  });
  return fieldErrors;
}

/**
 * Returns the error code from a backend response.
 */
export function getErrorCode(err) {
  return err?.response?.data?.error?.code || null;
}

/**
 * Returns true if the error is a 401 Unauthorized.
 */
export function isUnauthorized(err) {
  return err?.response?.status === 401;
}

/**
 * Returns true if the error is a 409 Conflict (e.g. duplicate email).
 */
export function isConflict(err) {
  return err?.response?.status === 409;
}
