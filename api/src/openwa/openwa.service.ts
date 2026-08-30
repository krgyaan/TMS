import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  OpenWAApiError,
  OpenWAAuthError,
  OpenWAClient,
  OpenWAConflictError,
  OpenWAForbiddenError,
  OpenWANotFoundError,
  OpenWARateLimitError,
  OpenWAServiceUnavailableError,
  OpenWATimeoutError
} from '@rmyndharis/openwa';
import { openwaConfig } from '../config/openwa.config';

@Injectable()
export class OpenwaService implements OnModuleInit {
  private readonly logger = new Logger(OpenwaService.name);
  private readonly client: OpenWAClient;
  private readonly sessionId: string;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000;

  constructor(
    @Inject(openwaConfig.KEY)
    private readonly config: ConfigType<typeof openwaConfig>,
  ) {
    this.sessionId = this.config.OPENWA_SESSION_ID;
    this.client = new OpenWAClient({
      baseUrl: this.config.OPENWA_BASE_URL,
      apiKey: this.config.OPENWA_API_KEY,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.sessions.start(this.sessionId);
      this.logger.log(`OpenWA session "${this.sessionId}" started`);
    } catch (error) {
      if (
        error instanceof OpenWAApiError &&
        error.status === 400 &&
        (error.body as Record<string, unknown>)?.code === 'SESSION_ALREADY_STARTED'
      ) {
        this.logger.log(`Session "${this.sessionId}" already running`);
      } else {
        this.logger.warn(
          `OpenWA session "${this.sessionId}" failed to start (will retry on send): ${error instanceof Error ? error.message : String(error)}`,
        );
        // Don't throw - allow app to start, send operations will retry
      }
    }
  }

  // ---- Public API ----

  /** Send a text message (individual or group) */
  async sendText(
    chatId: string,
    text: string,
    mentions?: string[],
  ): Promise<{ messageId: string }> {
    return this.withRetry(() =>
      this.client.messages.sendText(this.sessionId, { chatId, text, mentions }),
    );
  }

  /** Send a document (PDF, etc.) via URL or base64 */
  async sendDocument(
    chatId: string,
    options: {
      url?: string;
      base64?: string;
      mimetype?: string;
      filename?: string;
      caption?: string;
      mentions?: string[];
    },
  ): Promise<{ messageId: string }> {
    return this.withRetry(() =>
      this.client.messages.sendDocument(this.sessionId, { chatId, ...options }),
    );
  }

  /** Send an image via URL or base64 */
  async sendImage(
    chatId: string,
    options: {
      url?: string;
      base64?: string;
      mimetype?: string;
      caption?: string;
      mentions?: string[];
    },
  ): Promise<{ messageId: string }> {
    return this.withRetry(() =>
      this.client.messages.sendImage(this.sessionId, { chatId, ...options }),
    );
  }

  /** Access raw client for advanced operations (webhooks, groups, etc.) */
  getClient(): OpenWAClient {
    return this.client;
  }

  // ---- Internal ----

  /** Retry helper for transient errors (503, 429) */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable =
        error instanceof OpenWAServiceUnavailableError || // 503
        error instanceof OpenWARateLimitError; // 429

      if (!isRetryable || attempt >= this.maxRetries) {
        this.logger.error(
          `OpenWA call failed after ${attempt} retries`,
          error instanceof Error ? error.stack : error,
        );
        throw error;
      }

      const delay = this.baseRetryDelay * Math.pow(2, attempt);
      this.logger.warn(
        `OpenWA transient error (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms`,
        error instanceof Error ? error.message : String(error),
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(fn, attempt + 1);
    }
  }
}