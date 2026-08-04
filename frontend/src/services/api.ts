import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getAvatarUrl = (url: string | undefined) => {
  if (!url) return 'https://via.placeholder.com/40';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = API_URL;
  const hostUrl = baseUrl.replace('/api', '');
  return `${hostUrl}${url}`;
};

export default api;
