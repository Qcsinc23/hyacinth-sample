import React from 'react';
import { Settings, User, LogOut, Activity, Eye, Keyboard } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onSettingsClick?: () => void;
  onAccessibilityClick?: () => void;
  onShortcutHelpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSettingsClick, 
  onAccessibilityClick,
  onShortcutHelpClick 
}) => {
  const { staff, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hyacinth</h1>
              <p className="text-xs text-gray-500">Medication Dispensing System</p>
            </div>
          </div>

          {/* Staff Info and Actions */}
          <div className="flex items-center gap-3">
            {/* Keyboard shortcut hint */}
            <button
              onClick={onShortcutHelpClick || onSettingsClick}
              className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Press ? for keyboard shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span>Press ? for help</span>
            </button>

            {staff && (
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{staff.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                </div>
              </div>
            )}

            {/* Accessibility Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onAccessibilityClick}
              leftIcon={<Eye className="h-4 w-4" />}
              className="hidden sm:flex"
            >
              Accessibility
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              leftIcon={<Settings className="h-4 w-4" />}
            >
              Settings
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
