import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

type AiProvider = 'openrouter' | 'gemini';

@Injectable()
export class AiService {
  async generateText(prompt: string): Promise<string> {
    const apiKey = process.env.AI_API_KEY;
    const provider = this.resolveProvider();
    const model = process.env.AI_MODEL?.trim() || this.defaultModel(provider);
    const apiUrl = this.resolveApiUrl(provider, model, apiKey);

    if (!apiKey) {
      throw new InternalServerErrorException(
        'AI_API_KEY must be configured for AI upstream integration.',
      );
    }

    if (!apiUrl) {
      throw new InternalServerErrorException(
        'AI_API_URL could not be resolved. Check AI_PROVIDER/AI_MODEL configuration.',
      );
    }

    try {
      const request = this.buildRequest(provider, apiUrl, apiKey, model, prompt);
      const response = await axios.post(
        request.url,
        request.body,
        {
          headers: request.headers,
          timeout: 25000,
        },
      );

      const text = this.extractText(provider, response.data);

      if (typeof text !== 'string' || text.length === 0) {
        throw new BadGatewayException('AI API returned an empty response body.');
      }

      return text;
    } catch (error) {
      if (error instanceof InternalServerErrorException || error instanceof BadGatewayException) {
        throw error;
      }

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const upstreamPayload = axios.isAxiosError(error) ? error.response?.data : undefined;
      const upstreamMessage = this.extractErrorMessage(upstreamPayload);

      throw new BadGatewayException(
        `Failed to call ${provider} upstream${status ? ` (HTTP ${status})` : ''}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
      );
    }
  }

  private resolveProvider(): AiProvider {
    const provider = process.env.AI_PROVIDER?.toLowerCase().trim();

    if (provider === 'gemini') {
      return 'gemini';
    }

    if (provider === 'openrouter') {
      return 'openrouter';
    }

    const apiUrl = process.env.AI_API_URL?.toLowerCase() ?? '';
    if (apiUrl.includes('generativelanguage.googleapis.com') || apiUrl.includes('gemini')) {
      return 'gemini';
    }

    return 'openrouter';
  }

  private defaultModel(provider: AiProvider): string {
    if (provider === 'gemini') {
      return 'gemini-1.5-flash';
    }

    return 'google/gemini-2.0-flash-001';
  }

  private resolveApiUrl(provider: AiProvider, model: string, apiKey?: string): string | undefined {
    const explicitUrl = process.env.AI_API_URL?.trim();
    if (explicitUrl) {
      return explicitUrl;
    }

    if (provider === 'openrouter') {
      return 'https://openrouter.ai/api/v1/chat/completions';
    }

    if (!apiKey) {
      return undefined;
    }

    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  private buildRequest(
    provider: AiProvider,
    apiUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
  ): {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  } {
    if (provider === 'gemini') {
      return {
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        },
      };
    }

    return {
      url: apiUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      },
    };
  }

  private extractText(provider: AiProvider, data: any): string | undefined {
    if (provider === 'gemini') {
      return data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    return (
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.text ??
      data?.response
    );
  }

  private extractErrorMessage(upstreamPayload: any): string | undefined {
    if (!upstreamPayload) {
      return undefined;
    }

    if (typeof upstreamPayload === 'string') {
      return upstreamPayload;
    }

    return (
      upstreamPayload?.error?.message ??
      upstreamPayload?.message ??
      undefined
    );
  }
}