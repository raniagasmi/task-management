import axios from 'axios';
import api from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { EmployeeDashboardResponse } from '../types/dashboard';

class DashboardService {
  private buildAxiosErrorMessage(prefix: string, error: unknown): Error {
    if (!axios.isAxiosError(error)) {
      return new Error(prefix);
    }

    const responseMessage =
      typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : undefined;

    const fallback = error.message || `HTTP ${error.response?.status ?? 'error'}`;
    return new Error(`${prefix}: ${responseMessage ?? fallback}`);
  }

  async getMyDashboard(): Promise<EmployeeDashboardResponse> {
    try {
      const response = await api.get<EmployeeDashboardResponse>(API_ENDPOINTS.DASHBOARD.ME);
      return response.data;
    } catch (error) {
      throw this.buildAxiosErrorMessage('Failed to load dashboard', error);
    }
  }
}

export const dashboardService = new DashboardService();

