/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const API_ENDPOINTS = {
  SOURCES: `${API_BASE_URL}/sources`,
  SHUTDOWNS: `${API_BASE_URL}/shutdowns`,
  NEWS: `${API_BASE_URL}/news`,
  NEWS_HEADLINES: `${API_BASE_URL}/news/headlines`,
  GOVINFO: `${API_BASE_URL}/govinfo`,
  IMPACT_CALC: `${API_BASE_URL}/impact/calc`,
} as const;

export default API_ENDPOINTS;
