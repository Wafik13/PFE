import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import MachinesPage from './pages/MachinesPage'
import MachineDetailPage from './pages/MachineDetailPage'
import AlertsPage from './pages/AlertsPage'
import SettingsPage from './pages/SettingsPage'
import OverviewPage from './pages/OverviewPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/machines" replace />} />
                      <Route path="/overview" element={<OverviewPage />} />
                      <Route path="/machines" element={<MachinesPage />} />
                      <Route path="/machines/:id" element={<MachineDetailPage />} />
                      <Route path="/alerts" element={<AlertsPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/machines" replace />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
          
          {/* Global toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
              loading: {
                duration: Infinity,
              },
            }}
          />
        </div>
      </WebSocketProvider>
    </AuthProvider>
  )
}

export default App