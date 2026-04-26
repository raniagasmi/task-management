import { authService } from './auth.service';

export type NotificationChannel = 'collaboration' | 'reminders' | 'assignments';

export type NotificationPreferences = {
  channels: Record<NotificationChannel, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type CollaborationPreferences = {
  followedThreads: string[];
  savedReplies: string[];
};

export type WorkspacePreferences = {
  notifications: NotificationPreferences;
  collaboration: CollaborationPreferences;
};

const DEFAULT_PREFERENCES: WorkspacePreferences = {
  notifications: {
    channels: {
      collaboration: true,
      reminders: true,
      assignments: true,
    },
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
  collaboration: {
    followedThreads: [],
    savedReplies: [
      'I am on it and will post an update shortly.',
      'Blocked on a dependency. I have added details in the task note.',
      'Completed. Please review when you have a moment.',
    ],
  },
};

class WorkspacePreferencesService {
  private storageKey() {
    const userId = authService.getCurrentUser()?.id ?? 'anonymous';
    return `workspace-preferences:${userId}`;
  }

  getPreferences(): WorkspacePreferences {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) {
        return DEFAULT_PREFERENCES;
      }

      return {
        notifications: {
          ...DEFAULT_PREFERENCES.notifications,
          ...(JSON.parse(raw)?.notifications ?? {}),
          channels: {
            ...DEFAULT_PREFERENCES.notifications.channels,
            ...(JSON.parse(raw)?.notifications?.channels ?? {}),
          },
        },
        collaboration: {
          ...DEFAULT_PREFERENCES.collaboration,
          ...(JSON.parse(raw)?.collaboration ?? {}),
        },
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  savePreferences(preferences: WorkspacePreferences) {
    localStorage.setItem(this.storageKey(), JSON.stringify(preferences));
  }

  updatePreferences(updater: (preferences: WorkspacePreferences) => WorkspacePreferences) {
    const next = updater(this.getPreferences());
    this.savePreferences(next);
    return next;
  }

  shouldDeliver(channel: NotificationChannel, now = new Date()) {
    const preferences = this.getPreferences();
    if (!preferences.notifications.channels[channel]) {
      return false;
    }

    if (!preferences.notifications.quietHoursEnabled) {
      return true;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = preferences.notifications.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.notifications.quietHoursEnd.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (start === end) {
      return true;
    }

    const inQuietHours = start < end
      ? currentMinutes >= start && currentMinutes < end
      : currentMinutes >= start || currentMinutes < end;

    return !inQuietHours;
  }
}

export const workspacePreferencesService = new WorkspacePreferencesService();
