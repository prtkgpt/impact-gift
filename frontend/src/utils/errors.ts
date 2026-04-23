import axios, { AxiosError } from 'axios';

/**
 * Type guard to check if an error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Type guard to check if an error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'Request failed';
  }
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Extract error details from API responses
 */
export function getApiErrorDetails(error: unknown): { message: string; status?: number } {
  if (isAxiosError(error)) {
    return {
      message: error.response?.data?.error || error.message,
      status: error.response?.status
    };
  }
  return {
    message: getErrorMessage(error)
  };
}
