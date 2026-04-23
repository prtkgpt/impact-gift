import { AxiosRequestConfig, AxiosResponse } from 'axios';
import api from './api';
import { isAxiosError } from './errors';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  timeoutFirst?: number;
  timeoutRetry?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2,
  initialDelay: 2000,
  timeoutFirst: 15000,
  timeoutRetry: 20000,
  shouldRetry: (error: unknown) => {
    if (!isAxiosError(error)) return false;

    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = !error.response && error.message === 'Network Error';

    return isTimeout || isNetworkError;
  }
};

/**
 * Makes an API request with automatic retry logic for timeouts and network errors
 *
 * @param method - HTTP method ('get', 'post', 'put', 'delete')
 * @param url - API endpoint URL
 * @param config - Axios request config (optional)
 * @param options - Retry configuration options (optional)
 * @returns Promise resolving to AxiosResponse
 *
 * @example
 * // Simple GET request with default retry
 * const response = await retryApiRequest('get', '/events/my-event');
 *
 * // POST with custom retry options
 * const response = await retryApiRequest('post', '/rsvp',
 *   { data: { status: 'attending' } },
 *   { maxRetries: 3, initialDelay: 3000 }
 * );
 */
export async function retryApiRequest<T = any>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string,
  config?: AxiosRequestConfig,
  options?: RetryOptions
): Promise<AxiosResponse<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const makeRequest = async (retryCount: number): Promise<AxiosResponse<T>> => {
    const timeout = retryCount === 0 ? opts.timeoutFirst : opts.timeoutRetry;
    const requestConfig: AxiosRequestConfig = { ...config, timeout };

    try {
      let response: AxiosResponse<T>;

      switch (method) {
        case 'get':
          response = await api.get<T>(url, requestConfig);
          break;
        case 'post':
          response = await api.post<T>(url, config?.data, requestConfig);
          break;
        case 'put':
          response = await api.put<T>(url, config?.data, requestConfig);
          break;
        case 'patch':
          response = await api.patch<T>(url, config?.data, requestConfig);
          break;
        case 'delete':
          response = await api.delete<T>(url, requestConfig);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response;
    } catch (error: unknown) {
      if (opts.shouldRetry(error) && retryCount < opts.maxRetries) {
        const delay = opts.initialDelay * (retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(retryCount + 1);
      }
      throw error;
    }
  };

  return makeRequest(0);
}

/**
 * Convenience wrapper for GET requests with retry
 */
export async function retryGet<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: RetryOptions
): Promise<AxiosResponse<T>> {
  return retryApiRequest<T>('get', url, config, options);
}

/**
 * Convenience wrapper for POST requests with retry
 */
export async function retryPost<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  options?: RetryOptions
): Promise<AxiosResponse<T>> {
  return retryApiRequest<T>('post', url, { ...config, data }, options);
}

/**
 * Convenience wrapper for PUT requests with retry
 */
export async function retryPut<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  options?: RetryOptions
): Promise<AxiosResponse<T>> {
  return retryApiRequest<T>('put', url, { ...config, data }, options);
}

/**
 * Convenience wrapper for DELETE requests with retry
 */
export async function retryDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig,
  options?: RetryOptions
): Promise<AxiosResponse<T>> {
  return retryApiRequest<T>('delete', url, config, options);
}
