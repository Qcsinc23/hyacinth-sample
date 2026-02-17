import React from 'react';
import { Database, Shield } from 'lucide-react';

interface FooterProps {
  isLocalMode?: boolean;
  lastBackupTime?: Date;
  version?: string;
}

export const Footer: React.FC<FooterProps> = ({
  version = '1.0.0',
}) => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 py-2">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>v{version}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Local
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
