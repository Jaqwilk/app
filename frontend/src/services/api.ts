import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://macro-meal-planner-4.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Profile APIs
export const profileAPI = {
  update: async (profile: any) => {
    const response = await api.put('/profile', { profile });
    return response.data;
  },
  getTargets: async () => {
    const response = await api.get('/profile/targets');
    return response.data;
  },
};

// Daily Log APIs
export const dailyAPI = {
  getLog: async (date: string) => {
    const response = await api.get(`/daily/${date}`);
    return response.data;
  },
  logMeal: async (date: string, meal: any, mode: string, meal_time: string) => {
    const response = await api.post(`/daily/${date}/meal`, { meal, mode, meal_time });
    return response.data;
  },
  deleteMeal: async (date: string, mealId: string) => {
    const response = await api.delete(`/daily/${date}/meal/${mealId}`);
    return response.data;
  },
};

// AI APIs
export const aiAPI = {
  scanIngredients: async (imageBase64: string) => {
    const response = await api.post('/scan/ingredients', { image_base64: imageBase64 });
    return response.data;
  },
  generateMeals: async (params: {
    mode: string;
    ingredients?: string[];
    craving?: string;
    meal_time?: string;
    remaining_calories: number;
    remaining_protein: number;
    remaining_carbs: number;
    remaining_fat: number;
  }) => {
    const response = await api.post('/generate/meals', params);
    return response.data;
  },
};

// Weight APIs
export const weightAPI = {
  getHistory: async () => {
    const response = await api.get('/weight');
    return response.data;
  },
  log: async (date: string, weight: number) => {
    const response = await api.post('/weight', { date, weight });
    return response.data;
  },
};

// Premium APIs
export const premiumAPI = {
  getStatus: async () => {
    const response = await api.get('/premium/status');
    return response.data;
  },
  activate: async () => {
    const response = await api.post('/premium/activate');
    return response.data;
  },
};

// GDPR APIs
export const gdprAPI = {
  exportData: async () => {
    const response = await api.get('/export');
    return response.data;
  },
  deleteAccount: async () => {
    const response = await api.delete('/account');
    return response.data;
  },
};

export default api;
