import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'
import {
  HomeIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  {
    name: 'Overview',
    href: '/machines',
    icon: HomeIcon,
  },
  {
    name: 'Machines',
    href: '/machines',
    icon: CpuChipIcon,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: ExclamationTriangleIcon,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
]

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">IIP</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Industrial</h2>
                  <p className="text-sm text-gray-500">Intelligence Platform</p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/machines' && location.pathname.startsWith(item.href))
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'sidebar-link',
                      isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </NavLink>
                )
              })}
            </nav>
            
            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">CSM</span>
                </div>
                <div className="text-xs text-gray-500">
                  <p className="font-medium">CSM GIAS</p>
                  <p>ENSIT Partnership</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IIP</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Industrial</h2>
                <p className="text-xs text-gray-500">Intelligence Platform</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/machines' && location.pathname.startsWith(item.href))
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'sidebar-link',
                    isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
          
          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">CSM</span>
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium">CSM GIAS</p>
                <p>ENSIT Partnership</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar