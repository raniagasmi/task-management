export const API_BASE_URL = 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    ME: '/users/me',
    ME_PRESENCE: '/users/me/presence',
    PASSWORD: (id: string) => `/users/${id}/password`,
    AUDIT_LOGS: '/users/audit-logs',
  },
  TASKS: {
    BASE: '/tasks',
    BY_ID: (id: string) => `/tasks/${id}`,
    DETAILS: (id: string) => `/tasks/${id}/details`,
    STATUS: (id: string) => `/tasks/${id}/status`,
    ORDER: (id: string) => `/tasks/${id}/order`,
    ACTIVE: (id: string) => `/tasks/${id}/active`,
    BATCH_UPDATE_ORDERS: '/tasks/batch-update-orders',
  },
  RECRUITMENT: {
    BASE: '/api/recruitment',
    GENERATE: '/api/recruitment/generate',
    CHAT: '/api/recruitment/chat',
    LINKEDIN: '/api/recruitment/linkedin-post',
  },
  COLLABORATION: {
    BASE: '/collaboration',
    CONVERSATIONS: '/collaboration/conversations',
    CONVERSATIONS_BY_USER: (userId: string) => `/collaboration/conversations/user/${userId}`,
    MESSAGES: (conversationId: string) => `/collaboration/conversations/${conversationId}/messages`,
    AI_DECOMPOSE: (conversationId: string) => `/collaboration/conversations/${conversationId}/ai-decompose`,
    APPROVE_PROPOSAL: (proposalId: string) => `/collaboration/proposals/${proposalId}/approve`,
    REJECT_PROPOSAL: (proposalId: string) => `/collaboration/proposals/${proposalId}/reject`,
  },
};
