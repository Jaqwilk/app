import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface UserProfile {
  age: number;
  sex?: string;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  goal: string;
  target_rate?: number;
  dietary_type: string;
  allergies: string[];
  dislikes: string[];
  cooking_time: string;
  budget_mode: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  profile?: UserProfile;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  is_premium: boolean;
  streak: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (token, user) => {
    await storage.setItem('token', token);
    await storage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await storage.removeItem('token');
    await storage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await storage.getItem('token');
      const userStr = await storage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading session:', error);
      set({ isLoading: false });
    }
  },
}));
