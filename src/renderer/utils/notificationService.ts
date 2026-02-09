// Desktop notification service for Hyacinth
import { audioAlerts } from './audioAlerts';

export type NotificationType = 'expiring' | 'low_stock' | 'expired' | 'system' | 'success';

interface NotificationOptions {
  title: string;
  body: string;
  type: NotificationType;
  tag?: string;
  requireInteraction?: boolean;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
}

// Default settings
let settings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  desktopEnabled: true,
};

// Icon URLs for different notification types
const notificationIcons: Record<NotificationType, string> = {
  expiring: '⚠️',
  low_stock: '📦',
  expired: '🚫',
  system: 'ℹ️',
  success: '✅',
};

// Load settings from localStorage
function loadSettings() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hyacinth_notification_settings');
    if (saved) {
      try {
        settings = { ...settings, ...JSON.parse(saved) };
      } catch {
        // Use defaults
      }
    }
  }
}

// Save settings to localStorage
function saveSettings() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hyacinth_notification_settings', JSON.stringify(settings));
  }
}

// Request permission for desktop notifications
async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  return await Notification.requestPermission();
}

// Check if notifications are supported and permitted
function canShowDesktopNotification(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted' &&
    settings.desktopEnabled
  );
}

// Show desktop notification
function showDesktopNotification(options: NotificationOptions): Notification | null {
  if (!canShowDesktopNotification()) return null;
  
  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/icon.png', // App icon
      badge: '/badge.png',
      tag: options.tag || `hyacinth-${Date.now()}`,
      requireInteraction: options.requireInteraction ?? (options.type === 'expired' || options.type === 'low_stock'),
      data: options.data,
    });

    // Auto-close non-critical notifications after 5 seconds
    if (options.type !== 'expired' && options.type !== 'low_stock') {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch (e) {
    console.error('Failed to show notification:', e);
    return null;
  }
}

// Notification service
export const notificationService = {
  // Initialize the service
  init: async () => {
    loadSettings();
    
    // Request permission on init if enabled
    if (settings.desktopEnabled && Notification.permission === 'default') {
      await requestPermission();
    }
  },

  // Request permission explicitly
  requestPermission: async (): Promise<boolean> => {
    const permission = await requestPermission();
    return permission === 'granted';
  },

  // Check permission status
  getPermissionStatus: (): NotificationPermission => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  // Send a notification
  notify: (options: NotificationOptions): void => {
    if (!settings.enabled) return;

    // Play sound if enabled
    if (settings.soundEnabled) {
      switch (options.type) {
        case 'expired':
          audioAlerts.critical();
          break;
        case 'low_stock':
          audioAlerts.lowStock();
          break;
        case 'expiring':
          audioAlerts.expirationWarning();
          break;
        case 'success':
          audioAlerts.success();
          break;
        default:
          audioAlerts.info();
      }
    }

    // Show desktop notification
    if (settings.desktopEnabled) {
      showDesktopNotification(options);
    }
  },

  // Convenience methods for specific notification types
  expiringMedication: (medicationName: string, daysUntilExpiry: number) => {
    notificationService.notify({
      title: 'Medication Expiring Soon',
      body: `${medicationName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.`,
      type: 'expiring',
      tag: `expiring-${medicationName}`,
    });
  },

  expiredMedication: (medicationName: string, lotNumber?: string) => {
    notificationService.notify({
      title: '⚠️ Expired Medication',
      body: `${medicationName}${lotNumber ? ` (Lot: ${lotNumber})` : ''} has expired and should not be dispensed.`,
      type: 'expired',
      tag: `expired-${medicationName}`,
      requireInteraction: true,
    });
  },

  lowStock: (medicationName: string, currentQuantity: number, reorderPoint: number) => {
    notificationService.notify({
      title: 'Low Stock Alert',
      body: `${medicationName} is below reorder point. Current: ${currentQuantity}, Reorder at: ${reorderPoint}`,
      type: 'low_stock',
      tag: `lowstock-${medicationName}`,
      requireInteraction: true,
    });
  },

  // Settings management
  enable: () => {
    settings.enabled = true;
    saveSettings();
  },

  disable: () => {
    settings.enabled = false;
    saveSettings();
  },

  toggle: () => {
    settings.enabled = !settings.enabled;
    saveSettings();
    return settings.enabled;
  },

  isEnabled: () => settings.enabled,

  // Desktop notifications
  enableDesktop: async () => {
    const granted = await requestPermission();
    if (granted) {
      settings.desktopEnabled = true;
      saveSettings();
    }
    return granted;
  },

  disableDesktop: () => {
    settings.desktopEnabled = false;
    saveSettings();
  },

  toggleDesktop: async () => {
    if (settings.desktopEnabled) {
      settings.desktopEnabled = false;
      saveSettings();
      return false;
    } else {
      return await notificationService.enableDesktop();
    }
  },

  isDesktopEnabled: () => settings.desktopEnabled,

  // Sound settings
  enableSound: () => {
    settings.soundEnabled = true;
    saveSettings();
  },

  disableSound: () => {
    settings.soundEnabled = false;
    saveSettings();
  },

  toggleSound: () => {
    settings.soundEnabled = !settings.soundEnabled;
    saveSettings();
    return settings.soundEnabled;
  },

  isSoundEnabled: () => settings.soundEnabled,

  // Get all settings
  getSettings: () => ({ ...settings }),

  // Update settings
  updateSettings: (newSettings: Partial<NotificationSettings>) => {
    settings = { ...settings, ...newSettings };
    saveSettings();
  },
};

// Initialize on load
if (typeof window !== 'undefined') {
  notificationService.init();
}

export default notificationService;
