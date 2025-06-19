import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { cn } from '../utils/cn'
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'

interface HeaderProps {
  onMenuClick: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const { isConnected } = useWebSocket()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IIP</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
                Industrial Intelligence Platform
              </h1>
            </div>
          </div>
        </div>

        {/* Right side - Status, notifications, and user menu */}
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm text-gray-600 hidden sm:inline">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 relative"
            >
              <BellIcon className="w-6 h-6" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* Notifications dropdown */}
            <Transition
              show={notificationsOpen}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                    Recent Notifications
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No new notifications
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <UserCircleIcon className="w-6 h-6" />
              <span className="text-sm font-medium hidden sm:inline">
                {user?.username || 'User'}
              </span>
            </Menu.Button>
            
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
                    {user?.email}
                  </div>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={cn(
                          'flex items-center w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <Cog6ToothIcon className="w-4 h-4 mr-3" />
                        Settings
                      </button>
                    )}
                  </Menu.Item>
                  
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={cn(
                          'flex items-center w-full px-4 py-2 text-sm text-left',
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}

export default Header