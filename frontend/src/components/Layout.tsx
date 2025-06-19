import React, { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocket } from '../contexts/WebSocketContext'
import { cn } from '../utils/cn'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { connectionStatus } = useWebSocket()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Connection status indicator */}
        {connectionStatus !== 'connected' && (
          <div className={cn(
            'px-4 py-2 text-sm text-center',
            connectionStatus === 'connecting' && 'bg-yellow-100 text-yellow-800',
            connectionStatus === 'disconnected' && 'bg-gray-100 text-gray-800',
            connectionStatus === 'error' && 'bg-red-100 text-red-800'
          )}>
            {connectionStatus === 'connecting' && 'Connecting to real-time updates...'}
            {connectionStatus === 'disconnected' && 'Real-time updates disconnected'}
            {connectionStatus === 'error' && 'Connection error - some features may not work'}
          </div>
        )}
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout