import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Create axios instance
const createApiInstance = (): AxiosInstance => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
  
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response
    },
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        
        switch (status) {
          case 401:
            // Unauthorized - clear auth and redirect to login
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
            break
            
          case 403:
            toast.error('Access denied. You do not have permission to perform this action.')
            break
            
          case 404:
            toast.error('Resource not found.')
            break
            
          case 422:
            // Validation errors
            if (data.detail && Array.isArray(data.detail)) {
              const errorMessages = data.detail.map((err: any) => err.msg).join(', ')
              toast.error(`Validation error: ${errorMessages}`)
            } else {
              toast.error('Validation error occurred.')
            }
            break
            
          case 500:
            toast.error('Internal server error. Please try again later.')
            break
            
          default:
            toast.error(data.message || 'An unexpected error occurred.')
        }
      } else if (error.request) {
        // Network error
        toast.error('Network error. Please check your connection.')
      } else {
        // Other error
        toast.error('An unexpected error occurred.')
      }
      
      return Promise.reject(error)
    }
  )

  return instance
}

// Create the main API instance
export const api = createApiInstance()

// Generic API methods
export const apiMethods = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await api.get(url, config)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },

  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await api.post(url, data, config)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },

  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await api.put(url, data, config)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },

  patch: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await api.patch(url, data, config)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    try {
      const response = await api.delete(url, config)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  },
}

// Export default
export default api