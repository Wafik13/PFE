import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { cn } from '../utils/cn'
import {
  UserIcon,
  BellIcon,
  CogIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface NotificationSettings {
  emailAlerts: boolean
  pushNotifications: boolean
  criticalAlertsOnly: boolean
  maintenanceReminders: boolean
  systemUpdates: boolean
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  dateFormat: string
  refreshInterval: number
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  loginNotifications: boolean
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    department: '',
    role: user?.role || '',
  })
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    pushNotifications: true,
    criticalAlertsOnly: false,
    maintenanceReminders: true,
    systemUpdates: false,
  })
  
  // Display settings
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    refreshInterval: 30,
  })
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 60,
    loginNotifications: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      // In a real app, load settings from API
      // For now, use localStorage or default values
      const savedNotifications = localStorage.getItem('notificationSettings')
      const savedDisplay = localStorage.getItem('displaySettings')
      const savedSecurity = localStorage.getItem('securitySettings')
      
      if (savedNotifications) {
        setNotificationSettings(JSON.parse(savedNotifications))
      }
      
      if (savedDisplay) {
        setDisplaySettings(JSON.parse(savedDisplay))
      }
      
      if (savedSecurity) {
        setSecuritySettings(JSON.parse(savedSecurity))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async (settingsType: string, settings: any) => {
    try {
      setIsSaving(true)
      
      // In a real app, save to API
      localStorage.setItem(settingsType, JSON.stringify(settings))
      
      toast.success('Settings saved successfully')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(`Failed to save settings: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfileSave = async () => {
    await saveSettings('profileData', profileData)
  }

  const handleNotificationSave = async () => {
    await saveSettings('notificationSettings', notificationSettings)
  }

  const handleDisplaySave = async () => {
    await saveSettings('displaySettings', displaySettings)
  }

  const handleSecuritySave = async () => {
    await saveSettings('securitySettings', securitySettings)
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'display', name: 'Display', icon: ComputerDesktopIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'system', name: 'System', icon: CogIcon },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-8">
        {/* Sidebar */}
        <div className="lg:w-64 mb-6 lg:mb-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
                <button
                  onClick={handleProfileSave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="label">Department</label>
                  <select
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    className="input"
                  >
                    <option value="">Select Department</option>
                    <option value="operations">Operations</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="engineering">Engineering</option>
                    <option value="quality">Quality Assurance</option>
                    <option value="management">Management</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Role</label>
                  <input
                    type="text"
                    value={profileData.role}
                    readOnly
                    className="input bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                <button
                  onClick={handleNotificationSave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Email Alerts</h3>
                    <p className="text-sm text-gray-500">Receive alerts via email</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      emailAlerts: !notificationSettings.emailAlerts
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notificationSettings.emailAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notificationSettings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                    <p className="text-sm text-gray-500">Receive browser notifications</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      pushNotifications: !notificationSettings.pushNotifications
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notificationSettings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notificationSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Critical Alerts Only</h3>
                    <p className="text-sm text-gray-500">Only receive critical severity alerts</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      criticalAlertsOnly: !notificationSettings.criticalAlertsOnly
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notificationSettings.criticalAlertsOnly ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notificationSettings.criticalAlertsOnly ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Maintenance Reminders</h3>
                    <p className="text-sm text-gray-500">Receive scheduled maintenance notifications</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      maintenanceReminders: !notificationSettings.maintenanceReminders
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notificationSettings.maintenanceReminders ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notificationSettings.maintenanceReminders ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">System Updates</h3>
                    <p className="text-sm text-gray-500">Receive system update notifications</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      systemUpdates: !notificationSettings.systemUpdates
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      notificationSettings.systemUpdates ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        notificationSettings.systemUpdates ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Display Settings</h2>
                <button
                  onClick={handleDisplaySave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Theme</label>
                  <select
                    value={displaySettings.theme}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      theme: e.target.value as 'light' | 'dark' | 'auto'
                    })}
                    className="input"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Language</label>
                  <select
                    value={displaySettings.language}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, language: e.target.value })}
                    className="input"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Timezone</label>
                  <select
                    value={displaySettings.timezone}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, timezone: e.target.value })}
                    className="input"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Date Format</label>
                  <select
                    value={displaySettings.dateFormat}
                    onChange={(e) => setDisplaySettings({ ...displaySettings, dateFormat: e.target.value })}
                    className="input"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="label">Auto-refresh Interval (seconds)</label>
                  <select
                    value={displaySettings.refreshInterval}
                    onChange={(e) => setDisplaySettings({
                      ...displaySettings,
                      refreshInterval: parseInt(e.target.value)
                    })}
                    className="input"
                  >
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                <button
                  onClick={handleSecuritySave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? <LoadingSpinner size="sm" color="white" /> : 'Save Changes'}
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings({
                      ...securitySettings,
                      twoFactorAuth: !securitySettings.twoFactorAuth
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      securitySettings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        securitySettings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="label">Session Timeout (minutes)</label>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({
                      ...securitySettings,
                      sessionTimeout: parseInt(e.target.value)
                    })}
                    className="input"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Login Notifications</h3>
                    <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings({
                      ...securitySettings,
                      loginNotifications: !securitySettings.loginNotifications
                    })}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      securitySettings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        securitySettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="card p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">System Information</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Application Version</span>
                  <span className="text-sm text-gray-900">v1.0.0</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">API Version</span>
                  <span className="text-sm text-gray-900">v2.1.0</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">2024-01-15</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Environment</span>
                  <span className="text-sm text-gray-900">Production</span>
                </div>
                
                <div className="flex justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">Support Contact</span>
                  <span className="text-sm text-blue-600">support@iip.com</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">System Actions</h3>
                <div className="space-y-3">
                  <button className="btn btn-outline w-full justify-start">
                    <GlobeAltIcon className="w-4 h-4 mr-2" />
                    Check for Updates
                  </button>
                  
                  <button className="btn btn-outline w-full justify-start">
                    <CogIcon className="w-4 h-4 mr-2" />
                    Clear Cache
                  </button>
                  
                  <button className="btn btn-outline w-full justify-start">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Export User Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage