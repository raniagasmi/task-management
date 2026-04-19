import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';

export interface AuditLogEntry {
  _id?: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export const auditService = {
  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    const response = await api.get<AuditLogEntry[]>(API_ENDPOINTS.USERS.AUDIT_LOGS);
    return response.data;
  },
};
