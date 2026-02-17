import React from 'react';
import { LogOut, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onSettingsClick?: () => void;
  onAccessibilityClick?: () => void;
  onShortcutHelpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
}) => {
  const { staff, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Hyacinth</h1>
          </div>

          {/* Staff + Actions */}
          <div className="flex items-center gap-4">
            {staff && (
              <span className="text-sm text-gray-600">
                {staff.name}
                <span className="text-gray-400 ml-1 capitalize">({staff.role})</span>
              </span>
            )}

            <button
              onClick={onSettingsClick}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Settings
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
