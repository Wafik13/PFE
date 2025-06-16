import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.url?.includes('/login') && !config.url?.includes('/register')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer' | 'engineer' | 'manager';
  permissions: string[];
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: string;
  loginCount: number;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    dashboard: {
      layout: string;
      widgets: string[];
      refreshInterval: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
  permissions: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  phone?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    region: string;
  };
  isActive: boolean;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

export interface UserActivity {
  totalLogins: number;
  lastLogin: string;
  activeSessions: number;
  recentActions: Array<{
    action: string;
    timestamp: string;
    resource: string;
  }>;
  loginHistory: Array<{
    timestamp: string;
    ipAddress: string;
    location?: string;
    success: boolean;
  }>;
  deviceHistory: Array<{
    device: string;
    browser: string;
    os: string;
    lastUsed: string;
  }>;
}

export class AuthService {
  /**
   * Login user
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response: AxiosResponse = await apiClient.post('/login', credentials);
      const { token, refreshToken, user } = response.data;
      
      // Store tokens and user data
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response: AxiosResponse = await apiClient.post('/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.post('/logout');
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local storage even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<{ token: string; expiresIn: number }> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response: AxiosResponse = await apiClient.post('/refresh', {
        refreshToken,
      });
      
      const { token } = response.data;
      localStorage.setItem('token', token);
      
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens if refresh fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw error;
    }
  }

  /**
   * Validate current token
   */
  static async validateToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response: AxiosResponse = await apiClient.get('/validate');
      return response.data;
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      const response: AxiosResponse = await apiClient.post('/password-reset', { email });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response: AxiosResponse = await apiClient.post('/password-reset/confirm', {
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Change password (authenticated user)
   */
  static async changePassword(passwordData: PasswordChangeRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response: AxiosResponse = await apiClient.post('/password-change', passwordData);
      return response.data;
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.get('/profile');
      const user = response.data.user;
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.put('/profile', updates);
      const user = response.data.user;
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: Partial<User['preferences']>): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.put('/profile/preferences', { preferences });
      const user = response.data.user;
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  static async getSessions(): Promise<Session[]> {
    try {
      const response: AxiosResponse = await apiClient.get('/sessions');
      return response.data.sessions || [];
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  }

  /**
   * Revoke session
   */
  static async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions except current
   */
  static async revokeAllSessions(): Promise<{ success: boolean; revokedCount: number }> {
    try {
      const response: AxiosResponse = await apiClient.delete('/sessions/all');
      return response.data;
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      throw error;
    }
  }

  /**
   * Get user activity
   */
  static async getUserActivity(): Promise<UserActivity> {
    try {
      const response: AxiosResponse = await apiClient.get('/activity');
      return response.data;
    } catch (error) {
      console.error('Get user activity error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs (admin only)
   */
  static async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/audit-logs', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getUsers(filters?: {
    role?: string;
    department?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    try {
      const response: AxiosResponse = await apiClient.get('/users', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUser(id: string): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.get(`/users/${id}`);
      return response.data.user;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Create user (admin only)
   */
  static async createUser(userData: RegisterRequest & { role: User['role'] }): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.post('/users', userData);
      return response.data.user;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  /**
   * Update user (admin only)
   */
  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.put(`/users/${id}`, updates);
      return response.data.user;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(id: string): Promise<{ success: boolean }> {
    try {
      const response: AxiosResponse = await apiClient.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  /**
   * Activate/Deactivate user (admin only)
   */
  static async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    try {
      const response: AxiosResponse = await apiClient.patch(`/users/${id}/status`, { isActive });
      return response.data.user;
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  }

  /**
   * Get available roles and permissions
   */
  static async getRolesAndPermissions(): Promise<{
    roles: Array<{
      name: string;
      description: string;
      permissions: string[];
    }>;
    permissions: Array<{
      name: string;
      description: string;
      category: string;
    }>;
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/roles-permissions');
      return response.data;
    } catch (error) {
      console.error('Get roles and permissions error:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission
   */
  static hasPermission(permission: string): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      
      const user: User = JSON.parse(userStr);
      return user.permissions.includes(permission) || user.role === 'admin';
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  static hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Get current user from localStorage
   */
  static getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Get authentication token
   */
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response: AxiosResponse = await apiClient.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update user data with new avatar URL
      const user = this.getCurrentUser();
      if (user) {
        user.avatar = response.data.avatarUrl;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Health check for auth service
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: Record<string, { status: string; responseTime: number }>;
    activeUsers: number;
    activeSessions: number;
  }> {
    try {
      const response: AxiosResponse = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Auth service health check error:', error);
      throw error;
    }
  }
}

export default AuthService;