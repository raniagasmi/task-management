import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class RecruitmentService {
  private readonly baseUrl = `http://${process.env.RECRUITMENT_SERVICE_HOST ?? 'recruitment-service'}:${process.env.RECRUITMENT_SERVICE_PORT ?? '3004'}`;

  async health() {
    return this.forwardGet('/recruitment/health');
  }

  async generate(body: { prompt: string }) {
    return this.forwardPost('/recruitment/generate', body);
  }

  async chat(body: { sessionId: string; message: string }) {
    return this.forwardPost('/recruitment/chat', body);
  }

  async generateLinkedInPost(body: { jobOfferId: string }) {
    return this.forwardPost('/recruitment/linkedin-post', body);
  }

  async getCopilotHistory(userId: string) {
    const encoded = encodeURIComponent(userId);
    return this.forwardGet(`/recruitment/copilot/history?userId=${encoded}`);
  }

  async appendCopilotMessage(body: { userId: string; role: 'user' | 'assistant'; content: string }) {
    return this.forwardPost('/recruitment/copilot/message', body);
  }

  async resetCopilotHistory(userId: string) {
    return this.forwardPost('/recruitment/copilot/reset', { userId });
  }

  private async forwardGet(path: string) {
    return this.forward('GET', path);
  }

  private async forwardPost(path: string, body: unknown) {
    return this.forward('POST', path, body);
  }

  private async forward(method: 'GET' | 'POST', path: string, body?: unknown) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await response.text();
      const payload = this.safeParseJson(text);

      if (!response.ok) {
        const message =
          (payload && typeof payload === 'object' && 'message' in payload
            ? (payload as { message?: unknown }).message
            : undefined) ?? 'Recruitment service request failed';

        throw new HttpException(
          typeof message === 'string' ? message : 'Recruitment service request failed',
          response.status,
        );
      }

      return payload ?? text;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : 'Unknown network error';
      throw new ServiceUnavailableException(
        `Recruitment service is unavailable: ${reason}`,
      );
    }
  }

  private safeParseJson(value: string): unknown | null {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}
