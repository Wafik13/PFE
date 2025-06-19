export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'text' | 'outlined' | 'contained';
}

export interface CriticalAlert {
  id: string;
  title: string;
  message: string;
  severity: 'high' | 'critical';
  deviceId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface Alarm {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deviceId?: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

class NotificationServiceClass {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Subscribe to notification updates
  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    
    // Keep only the last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.notifyListeners();
    this.showBrowserNotification(newNotification);
    
    return newNotification.id;
  }

  // Show critical alert
  showCriticalAlert(alert: CriticalAlert) {
    const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
      title: `🚨 Critical Alert: ${alert.title}`,
      message: alert.message,
      type: 'critical',
      actions: [
        {
          label: 'Acknowledge',
          action: () => this.acknowledgeAlert(alert.id),
          variant: 'contained',
        },
        {
          label: 'View Details',
          action: () => this.viewAlertDetails(alert.id),
          variant: 'outlined',
        },
      ],
    };

    this.addNotification(notification);
    this.playAlertSound();
  }

  // Show alarm notification
  showAlarm(alarm: Alarm) {
    const priorityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
      title: `${priorityEmoji[alarm.priority]} ${alarm.title}`,
      message: alarm.message,
      type: alarm.priority === 'critical' ? 'critical' : alarm.priority === 'high' ? 'error' : 'warning',
      actions: [
        {
          label: 'Acknowledge',
          action: () => this.acknowledgeAlarm(alarm.id),
          variant: 'contained',
        },
        {
          label: 'View',
          action: () => this.viewAlarmDetails(alarm.id),
          variant: 'outlined',
        },
      ],
    };

    this.addNotification(notification);
    
    if (alarm.priority === 'critical' || alarm.priority === 'high') {
      this.playAlertSound();
    }
  }

  // Show success notification
  showSuccess(title: string, message: string) {
    this.addNotification({
      title,
      message,
      type: 'success',
    });
  }

  // Show error notification
  showError(title: string, message: string) {
    this.addNotification({
      title,
      message,
      type: 'error',
    });
  }

  // Show warning notification
  showWarning(title: string, message: string) {
    this.addNotification({
      title,
      message,
      type: 'warning',
    });
  }

  // Show info notification
  showInfo(title: string, message: string) {
    this.addNotification({
      title,
      message,
      type: 'info',
    });
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Remove notification
  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Private helper methods
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private showBrowserNotification(notification: Notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  private playAlertSound() {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  private acknowledgeAlert(alertId: string) {
    // This would typically make an API call to acknowledge the alert
    console.log('Acknowledging alert:', alertId);
    this.showSuccess('Alert Acknowledged', 'The critical alert has been acknowledged.');
  }

  private viewAlertDetails(alertId: string) {
    // This would typically navigate to the alert details page
    console.log('Viewing alert details:', alertId);
    window.location.href = `/alarms?alert=${alertId}`;
  }

  private acknowledgeAlarm(alarmId: string) {
    // This would typically make an API call to acknowledge the alarm
    console.log('Acknowledging alarm:', alarmId);
    this.showSuccess('Alarm Acknowledged', 'The alarm has been acknowledged.');
  }

  private viewAlarmDetails(alarmId: string) {
    // This would typically navigate to the alarm details page
    console.log('Viewing alarm details:', alarmId);
    window.location.href = `/alarms?alarm=${alarmId}`;
  }

  // Request browser notification permission
  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();

// Initialize browser notifications on load
if (typeof window !== 'undefined') {
  NotificationService.requestPermission();
}