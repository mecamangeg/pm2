import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized - logout user
      if (error.response.status === 401) {
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login';
      }

      // Server responded with error status
      const message =
        error.response.data?.error || error.response.data?.error?.message || 'An error occurred';
      console.error('API Error:', message);
      throw error; // Throw original error to preserve response data
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
      throw new Error('Network error - please check your connection');
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
      throw error;
    }
  }
);

export default apiClient;
