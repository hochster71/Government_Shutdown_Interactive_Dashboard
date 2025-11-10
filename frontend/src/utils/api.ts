import axios, { AxiosError } from 'axios';
import DOMPurify from 'isomorphic-dompurify';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for sanitizing outgoing data
api.interceptors.request.use(
  (config) => {
    // Sanitize request data if present
    if (config.data && typeof config.data === 'object') {
      config.data = sanitizeObject(config.data);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const customError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };

    if (error.code === 'ECONNABORTED') {
      customError.message = 'Request timeout. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      customError.message = 'Network error. Please check your connection.';
    } else if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as unknown;
      if (responseData && typeof responseData === 'object') {
        const rd = responseData as Record<string, unknown>;
        const msg = rd['message'] ?? rd['error'];
        if (typeof msg === 'string') {
          customError.message = msg;
        }
      } else if (typeof responseData === 'string') {
        customError.message = responseData;
      }
    } else if (error.request) {
      customError.message = 'No response from server. Please try again later.';
    }

    return Promise.reject(customError);
  }
);

/**
 * Sanitize a string using DOMPurify
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [] 
  });
}

/**
 * Sanitize an object's string properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as unknown);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitize HTML content for safe rendering
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

/**
 * Fetch shutdown data from API
 */
export async function fetchShutdowns() {
  const response = await api.get('/api/shutdowns');
  return response.data;
}

/**
 * Fetch news articles from API
 */
export async function fetchNews(query?: string, pageSize?: number, sortBy?: string) {
  const params: Record<string, unknown> = {};
  if (query) params.query = sanitizeString(query);
  if (pageSize) params.pageSize = pageSize;
  if (sortBy) params.sortBy = sortBy;

  const response = await api.get('/api/news', { params });
  return response.data;
}

/**
 * Fetch top headlines from API
 */
export async function fetchHeadlines(category?: string, country?: string, pageSize?: number) {
  const params: Record<string, unknown> = {};
  if (category) params.category = category;
  if (country) params.country = country;
  if (pageSize) params.pageSize = pageSize;

  const response = await api.get('/api/news/headlines', { params });
  return response.data;
}

/**
 * Calculate economic impact
 */
export async function calculateImpact(duration: number, affectedWorkers?: number, year?: number) {
  // Validate inputs before sending
  if (duration < 1 || duration > 365) {
    throw new Error('Duration must be between 1 and 365 days');
  }
  if (affectedWorkers !== undefined && (affectedWorkers < 1000 || affectedWorkers > 3000000)) {
    throw new Error('Affected workers must be between 1,000 and 3,000,000');
  }
  if (year !== undefined && (year < 1970 || year > 2100)) {
    throw new Error('Year must be between 1970 and 2100');
  }

  const response = await api.post('/api/impact/calc', {
    duration,
    affectedWorkers,
    year,
  });
  return response.data;
}

/**
 * Fetch data sources
 */
export async function fetchSources() {
  const response = await api.get('/api/sources');
  return response.data;
}

export default api;
