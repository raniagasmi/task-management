import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import { jwtDecode } from 'jwt-decode';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  teamSize?: string;
  primaryUseCase?: string;
  invitedTeammates?: string[];
}

interface User {
  id: string;
  _id?: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  emailVerified?: boolean;
  teamSize?: string;
  workspaceRole?: string;
  primaryUseCase?: string;
  invitedTeammates?: string[];
  onboardingCompleted?: boolean;
}

interface AuthResponse {
  access_token: string;
  user: User;
  verificationToken?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

interface AuthActionResponse {
  success: boolean;
  message: string;
  verificationToken?: string;
  provider?: string;
  available?: boolean;
}

const normalizeRole = (role?: string) => role?.toLowerCase() ?? '';

const normalizeUserId = (user: User): string => user.id || user._id || user.userId || '';

const normalizeUser = (user: User): User => ({
  ...user,
  id: normalizeUserId(user),
  role: normalizeRole(user.role),
});

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      // Clear any existing auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
      const { access_token, user } = response.data;

      if (!access_token || !user) {
        throw new Error('Invalid response from server');
      }

      // Store token
      localStorage.setItem('token', access_token);

      // Store user data
      localStorage.setItem('user', JSON.stringify(normalizeUser(user)));

      return response.data;
    } catch (error: unknown) {
      console.error('Login error:', error);
      // Clean up any partial data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      // Clear any existing auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const response = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, data);
      const { access_token, user } = response.data;

      if (!access_token || !user) {
        throw new Error('Invalid response from server');
      }

      // Store token
      localStorage.setItem('token', access_token);

      // Store user data
      localStorage.setItem('user', JSON.stringify(normalizeUser(user)));

      return response.data;
    } catch (error: unknown) {
      console.error('Register error:', error);
      // Clean up any partial data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  },

  forgotPassword: async (email: string): Promise<AuthActionResponse> => {
    const response = await api.post<AuthActionResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<AuthActionResponse> => {
    const response = await api.post<AuthActionResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<AuthActionResponse & { user?: User }> => {
    const response = await api.post<AuthActionResponse & { user?: User }>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
    if (response.data.user) {
      const existingUser = authService.getCurrentUser();
      localStorage.setItem('user', JSON.stringify({
        ...(existingUser ?? {}),
        ...normalizeUser(response.data.user),
      }));
    }
    return response.data;
  },

  resendVerification: async (email: string): Promise<AuthActionResponse> => {
    const response = await api.post<AuthActionResponse>(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
    return response.data;
  },

  initiateSso: async (provider: 'google' | 'microsoft', email?: string): Promise<AuthActionResponse> => {
    const response = await api.post<AuthActionResponse>(API_ENDPOINTS.AUTH.SSO_INITIATE, { provider, email });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  restoreSession: (): User | null => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        return null;
      }

      if (!authService.isAuthenticated()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }

      const user = normalizeUser(JSON.parse(userStr));
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error restoring session:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },

  getCurrentUser: (): User | null => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!userStr || !token) {
        return null;
      }

      // Check token validity
      if (!authService.isAuthenticated()) {
        authService.logout();
        return null;
      }

      return normalizeUser(JSON.parse(userStr));
    } catch (error) {
      console.error('Error getting current user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },

  getStoredUserRole: (): string | null => {
    try {
      const currentUser = authService.getCurrentUser();
      return currentUser?.role ?? null;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return false;
      }

      const decoded = jwtDecode<JwtPayload>(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const isValid = decoded.exp * 1000 > Date.now();
      if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      return isValid;
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  }
};
