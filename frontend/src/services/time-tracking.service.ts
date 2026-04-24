import { TimeTrackingStatus, TimeTrackingSession } from '../types/analytics';

class TimeTrackingService {
  getAllSessions(): TimeTrackingSession[] {
    return [];
  }

  calculateDailyFocusTime(userId: string, sessions: TimeTrackingSession[]): number {
    return this.calculateTimeByStatus(userId, sessions, 'ONLINE');
  }

  calculatePauseTime(userId: string, sessions: TimeTrackingSession[]): number {
    return this.calculateTimeByStatus(userId, sessions, 'PAUSE');
  }

  calculateTimeByStatus(
    userId: string,
    sessions: TimeTrackingSession[],
    status: TimeTrackingStatus
  ): number {
    const userSessions = sessions.filter((s) => s.userId === userId);
    const totalSeconds = userSessions
      .filter((s) => s.status === status)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    return Math.floor(totalSeconds / 60);
  }
}

export const timeTrackingService = new TimeTrackingService();
