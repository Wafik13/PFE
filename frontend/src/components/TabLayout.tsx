import React from 'react'
import { cn } from '../utils/cn'

interface Tab {
  id: string
  name: string
  component: React.ReactNode
  badge?: string | number
  disabled?: boolean
}

interface TabLayoutProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

const TabLayout: React.FC<TabLayoutProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className 
}) => {
  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                className={cn(
                  'tab-button whitespace-nowrap',
                  isActive ? 'tab-button-active' : 'tab-button-inactive',
                  tab.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span>{tab.name}</span>
                {tab.badge && (
                  <span className={cn(
                    'ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full',
                    isActive 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTabData.component}
      </div>
    </div>
  )
}

export default TabLayout