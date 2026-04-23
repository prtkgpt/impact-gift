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
    const data = error.response?.data as Record<string, unknown> | undefined;
    return (data?.error as string) || error.message || 'Request failed';
  }
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
    return (error as Record<string, unknown>).message as string;
  }
  return 'An unknown error occurred';
}

/**
 * Extract error details from API responses
 */
export function getApiErrorDetails(error: unknown): { message: string; status?: number } {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    return {
      message: (data?.error as string) || error.message,
      status: error.response?.status
    };
  }
  return {
    message: getErrorMessage(error)
  };
}
