import React, { useState } from 'react';
import { Zap, Star, History, FileText } from 'lucide-react';
import { FavoritePatients, FavoriteButton } from './FavoritePatients';
import { RecentPatients } from './RecentPatients';
import { TemplateSelector, QuickTemplateButtons } from './TemplateSelector';
import type { Patient } from '../../types';
import type { DispensingTemplate } from '../../data/dispensingTemplates';

interface QuickDispensePanelProps {
  onSelectPatient: (patient: Patient) => void;
  onSelectTemplate: (template: DispensingTemplate) => void;
  selectedPatient?: Patient | null;
  className?: string;
}

type PanelTab = 'favorites' | 'recent' | 'templates';

export const QuickDispensePanel: React.FC<QuickDispensePanelProps> = ({
  onSelectPatient,
  onSelectTemplate,
  selectedPatient,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('favorites');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'favorites', label: 'Favorites', icon: <Star className="h-4 w-4" /> },
    { id: 'recent', label: 'Recent', icon: <History className="h-4 w-4" /> },
    { id: 'templates', label: 'Templates', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-white" />
            <h2 className="text-sm font-semibold text-white">Quick Dispense</h2>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/80 hover:text-white"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3">
            {activeTab === 'favorites' && (
              <FavoritePatients
                onSelectPatient={onSelectPatient}
                maxDisplay={5}
              />
            )}

            {activeTab === 'recent' && (
              <RecentPatients
                onSelectPatient={onSelectPatient}
                maxDisplay={10}
                refreshInterval={30000}
              />
            )}

            {activeTab === 'templates' && (
              <div className="space-y-3">
                <TemplateSelector
                  onSelectTemplate={onSelectTemplate}
                  className="mb-3"
                />
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-2">Quick Select:</p>
                  <QuickTemplateButtons
                    onSelectTemplate={onSelectTemplate}
                    limit={4}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="p-3 border-t border-gray-200 bg-blue-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500">Selected Patient</p>
                  <p className="font-medium text-gray-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
                    Chart: {selectedPatient.chartNumber}
                  </p>
                </div>
                <FavoriteButton patient={selectedPatient} size="sm" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Compact quick dispense sidebar for use in Entry Form
 */
interface QuickDispenseSidebarProps {
  onSelectPatient: (patient: Patient) => void;
  onSelectTemplate: (template: DispensingTemplate) => void;
  selectedPatient?: Patient | null;
  className?: string;
}

export const QuickDispenseSidebar: React.FC<QuickDispenseSidebarProps> = ({
  onSelectPatient,
  onSelectTemplate,
  selectedPatient: _selectedPatient,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <FavoritePatients
        onSelectPatient={onSelectPatient}
        className="mb-4"
        maxDisplay={5}
      />
      
      <RecentPatients
        onSelectPatient={onSelectPatient}
        maxDisplay={5}
        refreshInterval={60000}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          Quick Templates
        </h3>
        <QuickTemplateButtons
          onSelectTemplate={onSelectTemplate}
          limit={4}
        />
      </div>
    </div>
  );
};

export default QuickDispensePanel;
