import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'

interface User {
  id: string
  username: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on app start
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      const response = await authApi.login(username, password)
      
      if (response.success && response.data) {
        const { token: newToken, user: newUser } = response.data
        
        setToken(newToken)
        setUser(newUser)
        
        // Store in localStorage
        localStorage.setItem('auth_token', newToken)
        localStorage.setItem('auth_user', JSON.stringify(newUser))
        
        toast.success(`Welcome back, ${newUser.username}!`)
        return true
      } else {
        toast.error(response.message || 'Login failed')
        return false
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout API if token exists
      if (token) {
        await authApi.logout()
      }
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Clear state and localStorage regardless of API call result
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      toast.success('Logged out successfully')
    }
  }

  const isAuthenticated = !!token && !!user

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}