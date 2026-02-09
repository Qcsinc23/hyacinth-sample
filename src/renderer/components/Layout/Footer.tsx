import React from 'react';
import { Database, Wifi, WifiOff, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FooterProps {
  isLocalMode?: boolean;
  lastBackupTime?: Date;
  version?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  isLocalMode = false, 
  lastBackupTime,
  version = '1.0.0',
}) => {
  const { staff } = useAuth();

  const getBackupStatus = () => {
    if (!lastBackupTime) return { text: 'No backup', color: 'text-gray-400' };
    
    const hoursSinceBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceBackup < 1) {
      return { text: 'Backed up just now', color: 'text-emerald-500' };
    } else if (hoursSinceBackup < 24) {
      return { text: `Backed up ${Math.floor(hoursSinceBackup)}h ago`, color: 'text-emerald-500' };
    } else {
      return { text: `Backed up ${Math.floor(hoursSinceBackup / 24)}d ago`, color: 'text-amber-500' };
    }
  };

  const backupStatus = getBackupStatus();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center text-sm">
          {/* Left side - Version and Mode */}
          <div className="flex items-center gap-4">
            <span className="text-gray-500">v{version}</span>
            
            {isLocalMode ? (
              <span className="flex items-center gap-1 text-amber-600">
                <WifiOff className="h-4 w-4" />
                Local Mode
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <Wifi className="h-4 w-4" />
                Connected
              </span>
            )}

            <span className="flex items-center gap-1 text-blue-600">
              <Shield className="h-4 w-4" />
              HIPAA Compliant
            </span>
          </div>

          {/* Right side - Staff and Backup */}
          <div className="flex items-center gap-4">
            {staff && (
              <span className="text-gray-600">
                Logged in as <span className="font-medium">{staff.name}</span>
              </span>
            )}
            
            <span className={`flex items-center gap-1 ${backupStatus.color}`}>
              <Database className="h-4 w-4" />
              {backupStatus.text}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
