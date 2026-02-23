const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://16.171.234.222:3000/api/v1';

interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kcu-token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kcu-token');
          localStorage.removeItem('kcu-authenticated');
          localStorage.removeItem('kcu-role');
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      const errorData: ApiError = await response.json().catch(() => ({
        message: response.statusText,
      }));

      const error = new Error(errorData.message || 'Request failed');
      (error as any).code = errorData.code;
      (error as any).errors = errorData.errors;
      throw error;
    }

    const data = await response.json();
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data) && (typeof (data as any).total === 'number' || typeof (data as any).page === 'number')) {
      return data as T;
    }
    return data.data !== undefined ? data.data : data;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const requestBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined);
    return this.request<T>(endpoint, {
      method: 'POST',
      body: requestBody,
      ...options,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);

export default api;
