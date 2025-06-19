import { apiMethods, ApiResponse } from './index'

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  email: string
  role: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LogoutResponse {
  message: string
}

export const authApi = {
  /**
   * Login user with username and password
   */
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    return apiMethods.post<LoginResponse>('/auth/login', {
      username,
      password,
    })
  },

  /**
   * Logout current user
   */
  logout: async (): Promise<ApiResponse<LogoutResponse>> => {
    return apiMethods.post<LogoutResponse>('/auth/logout')
  },

  /**
   * Verify current token
   */
  verifyToken: async (): Promise<ApiResponse<{ valid: boolean }>> => {
    return apiMethods.get<{ valid: boolean }>('/auth/verify')
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    return apiMethods.post<{ token: string }>('/auth/refresh')
  },
}