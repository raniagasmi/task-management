import { TimeTrackingStatus, TimeTrackingSession } from '../types/analytics';

/**
 * Time Tracking Service
 * Tracks user online/pause/offline status and calculates focus time metrics
 */
class TimeTrackingService {
  private sessions: Map<string, TimeTrackingSession> = new Map();
  private statusChangeCallbacks: Map<
    string,
    (status: TimeTrackingStatus, session: TimeTrackingSession) => void
  > = new Map();

  private lastActivityTime = Date.now();
  private inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  private inactivityCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Start tracking for a user
   */
  startTracking(userId: string) {
    const existingSession = this.sessions.get(userId);
    if (existingSession) return existingSession;

    const session: TimeTrackingSession = {
      id: `${userId}-${Date.now()}`,
      userId,
      status: 'ONLINE',
      startedAt: new Date(),
    };

    this.sessions.set(userId, session);
    this.setupInactivityDetection(userId);
    this.notifyStatusChange(userId, 'ONLINE', session);

    return session;
  }

  /**
   * Stop tracking for a user
   */
  stopTracking(userId: string) {
    const session = this.sessions.get(userId);
    if (session) {
      session.duration = Math.floor(
        (Date.now() - session.startedAt.getTime()) / 1000
      );
      this.sessions.delete(userId);
      this.notifyStatusChange(userId, 'OFFLINE', session);
    }
  }

  /**
   * Update status (ONLINE -> PAUSE -> ONLINE)
   */
  updateStatus(userId: string, status: TimeTrackingStatus) {
    const session = this.sessions.get(userId);
    if (!session) return;

    session.status = status;
    this.notifyStatusChange(userId, status, session);

    if (status === 'ONLINE') {
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Record user activity (mouse move, keypress, etc.)
   */
  recordActivity(userId: string) {
    this.lastActivityTime = Date.now();
    const session = this.sessions.get(userId);
    if (session && session.status !== 'ONLINE') {
      this.updateStatus(userId, 'ONLINE');
    }
  }

  /**
   * Get current session for a user
   */
  getSession(userId: string): TimeTrackingSession | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): TimeTrackingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Calculate daily focus time in minutes
   */
  calculateDailyFocusTime(userId: string, sessions: TimeTrackingSession[]): number {
    return this.calculateTimeByStatus(userId, sessions, 'ONLINE');
  }

  /**
   * Calculate pause time in minutes
   */
  calculatePauseTime(userId: string, sessions: TimeTrackingSession[]): number {
    return this.calculateTimeByStatus(userId, sessions, 'PAUSE');
  }

  /**
   * Calculate time by status in minutes
   */
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

  /**
   * Register callback for status changes
   */
  onStatusChange(
    userId: string,
    callback: (status: TimeTrackingStatus, session: TimeTrackingSession) => void
  ) {
    this.statusChangeCallbacks.set(userId, callback);
  }

  /**
   * Setup inactivity detection
   */
  private setupInactivityDetection(userId: string) {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
    }

    this.inactivityCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      const session = this.sessions.get(userId);

      if (session && session.status === 'ONLINE' && timeSinceLastActivity > this.inactivityThreshold) {
        this.updateStatus(userId, 'PAUSE');
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(
    userId: string,
    status: TimeTrackingStatus,
    session: TimeTrackingSession
  ) {
    const callback = this.statusChangeCallbacks.get(userId);
    if (callback) {
      callback(status, session);
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
    }
    this.sessions.clear();
    this.statusChangeCallbacks.clear();
  }
}

export const timeTrackingService = new TimeTrackingService();
