const raw = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export const API_ORIGIN = raw.endsWith('/api') ? raw.slice(0, -4) : raw;
export const API_BASE = `${API_ORIGIN}/api`;
