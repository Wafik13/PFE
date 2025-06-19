import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { cn } from '../utils/cn'

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Redirect if already authenticated
  const from = (location.state as any)?.from?.pathname || '/machines'
  
  useEffect(() => {
    if (isAuthenticated) {
      // Clear any existing errors when user becomes authenticated
      setErrors({})
    }
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 3) {
      newErrors.password = 'Password must be at least 3 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const success = await login(formData.username, formData.password)
      if (!success) {
        setErrors({ general: 'Invalid username or password' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">IIP</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">Industrial</h1>
              <p className="text-lg text-gray-600">Intelligence Platform</p>
            </div>
          </div>
          
          {/* Partnership logos */}
          <div className="flex justify-center items-center space-x-6 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-bold text-sm">CSM</span>
              </div>
              <p className="text-xs text-gray-500">CSM GIAS</p>
            </div>
            <div className="text-gray-400">+</div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-bold text-sm">ENSIT</span>
              </div>
              <p className="text-xs text-gray-500">ENSIT</p>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to your account
          </h2>
          <p className="text-sm text-gray-600">
            Monitor and control your industrial systems
          </p>
        </div>

        {/* Login form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* General error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Username field */}
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className={cn(
                  'input',
                  errors.username && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                )}
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={cn(
                    'input pr-10',
                    errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'btn btn-primary w-full',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" color="white" className="mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          
          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Username:</strong> admin</p>
              <p><strong>Password:</strong> admin123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage