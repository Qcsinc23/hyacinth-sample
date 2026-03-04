import React from 'react';
import { ClipboardList, BookOpen, Package, Pill, BarChart3 } from 'lucide-react';
import type { TabId } from '../../types';
import { useAlerts } from '../../contexts/AlertContext';

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  const { criticalCount, warningCount } = useAlerts();

  const tabs: TabItem[] = [
    { id: 'entry', label: 'Entry Form', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'log', label: 'Dispensing Log', icon: <BookOpen className="h-5 w-5" /> },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Package className="h-5 w-5" />,
      badge: criticalCount > 0 ? criticalCount : warningCount > 0 ? warningCount : undefined,
    },
    { id: 'guide', label: 'Medication Guide', icon: <Pill className="h-5 w-5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200
                  ${isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span 
                    className={`
                      ml-1 px-2 py-0.5 text-xs rounded-full
                      ${tab.badge > 0 && tab.id === 'inventory' && criticalCount > 0
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-amber-100 text-amber-700'
                      }
                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TabNav;
