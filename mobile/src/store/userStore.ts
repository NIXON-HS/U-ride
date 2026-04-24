import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true, // Carga inicial para no saltar a Pantalla Login si ya hay sesión

  login: async (token, user) => {
    await AsyncStorage.setItem('@uride_token', token);
    await AsyncStorage.setItem('@uride_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.removeItem('@uride_token');
    await AsyncStorage.removeItem('@uride_user');
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('@uride_token');
      const userStr = await AsyncStorage.getItem('@uride_user');
      
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
