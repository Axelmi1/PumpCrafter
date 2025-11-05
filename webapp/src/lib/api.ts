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
    
    console.log('🔐 Adding auth header:', {
      hasInitData: !!initDataRaw,
      length: initDataRaw?.length,
    });
    
    if (initDataRaw && initDataRaw.length > 0) {
      config.headers['x-telegram-init-data'] = initDataRaw;
      console.log('✅ Auth header added');
    } else {
      console.warn('⚠️  No initDataRaw available');
    }
  } catch (error) {
    console.error('❌ Failed to add auth header:', error);
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

