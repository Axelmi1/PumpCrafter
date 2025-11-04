import axios from 'axios';
import { getLaunchParams } from './telegram';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Telegram auth to all requests
api.interceptors.request.use((config) => {
  try {
    const { initDataRaw } = getLaunchParams();
    if (initDataRaw) {
      config.headers['x-telegram-init-data'] = initDataRaw;
    }
  } catch (error) {
    console.error('Failed to add auth header:', error);
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export { api };

