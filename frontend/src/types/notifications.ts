export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
  category?: NotificationCategory;
  sourceId?: string;
  userId?: string;
}

export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'critical'
  | 'system'
  | 'device'
  | 'alarm'
  | 'maintenance';

export type NotificationPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'urgent';

export type NotificationCategory = 
  | 'system'
  | 'device'
  | 'alarm'
  | 'maintenance'
  | 'security'
  | 'performance'
  | 'user'
  | 'ml'
  | 'data';

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface NotificationFilter {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  category?: NotificationCategory[];
  read?: boolean;
  dismissed?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  types: {
    [K in NotificationType]: {
      enabled: boolean;
      sound: boolean;
      email: boolean;
      browser: boolean;
    };
  };
  priorities: {
    [K in NotificationPriority]: {
      enabled: boolean;
      sound: boolean;
      email: boolean;
      browser: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    days: number[]; // 0-6 (Sunday-Saturday)
  };
  maxNotifications: number;
  autoMarkReadAfter: number; // seconds
  groupSimilar: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  titleTemplate: string;
  messageTemplate: string;
  priority: NotificationPriority;
  actions?: Omit<NotificationAction, 'action'>[];
  conditions?: NotificationCondition[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  byCategory: Record<NotificationCategory, number>;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  stats: NotificationStats;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
  clearNotifications: () => void;
  
  // Filtering and searching
  filterNotifications: (filter: NotificationFilter) => Notification[];
  searchNotifications: (query: string) => Notification[];
  
  // Settings
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Templates
  getTemplates: () => NotificationTemplate[];
  createTemplate: (template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, template: Partial<NotificationTemplate>) => void;
  deleteTemplate: (id: string) => void;
  
  // Bulk operations
  bulkMarkAsRead: (ids: string[]) => void;
  bulkDismiss: (ids: string[]) => void;
  bulkDelete: (ids: string[]) => void;
  
  // Real-time updates
  subscribe: (callback: (notifications: Notification[]) => void) => () => void;
  
  // Export/Import
  exportNotifications: (filter?: NotificationFilter) => Promise<Blob>;
  importNotifications: (file: File) => Promise<void>;
}

export interface NotificationEvent {
  type: 'notification_added' | 'notification_updated' | 'notification_removed' | 'settings_updated';
  payload: any;
  timestamp: Date;
}

export interface NotificationQueue {
  id: string;
  notifications: Notification[];
  processing: boolean;
  maxSize: number;
  processingRate: number; // notifications per second
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: 'browser' | 'email' | 'sms' | 'push' | 'webhook';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'browser' | 'email' | 'sms' | 'push' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
  rateLimit?: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  browserNotifications: true,
  emailNotifications: false,
  soundEnabled: true,
  vibrationEnabled: true,
  types: {
    info: { enabled: true, sound: false, email: false, browser: true },
    success: { enabled: true, sound: false, email: false, browser: true },
    warning: { enabled: true, sound: true, email: false, browser: true },
    error: { enabled: true, sound: true, email: true, browser: true },
    critical: { enabled: true, sound: true, email: true, browser: true },
    system: { enabled: true, sound: false, email: false, browser: true },
    device: { enabled: true, sound: true, email: false, browser: true },
    alarm: { enabled: true, sound: true, email: true, browser: true },
    maintenance: { enabled: true, sound: false, email: false, browser: true },
  },
  priorities: {
    low: { enabled: true, sound: false, email: false, browser: true },
    medium: { enabled: true, sound: false, email: false, browser: true },
    high: { enabled: true, sound: true, email: false, browser: true },
    critical: { enabled: true, sound: true, email: true, browser: true },
    urgent: { enabled: true, sound: true, email: true, browser: true },
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  maxNotifications: 100,
  autoMarkReadAfter: 300, // 5 minutes
  groupSimilar: true,
};