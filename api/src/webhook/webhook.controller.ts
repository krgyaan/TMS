import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

import { Public } from '@/modules/auth/decorators/public.decorator';
import {
  PoApprovalService,
  type IncomingWhatsappWebhookData,
} from '@/modules/operations/purchase-orders/po-approval.service';

interface OpenwaWebhookPayload {
  event: string;
  sessionId: string;
  data: IncomingWhatsappWebhookData;
}

@Public()
@Controller('webhook/openwa')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly poApprovalService?: PoApprovalService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-openwa-signature') signature: string,
  ): Promise<{ received: boolean }> {
    // 1. Verify HMAC signature
    if (!signature) {
      this.logger.warn('Missing x-openwa-signature header');
      return { received: false };
    }

    const secret = this.config.getOrThrow<string>('OPENWA_WEBHOOK_SECRET');
    const rawBody = (req as any).rawBody;
    const bodyString = rawBody ? rawBody.toString() : JSON.stringify(req.body);
    this.logger.debug(`HMAC body: ${bodyString}`);
    const expectedSignature = createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');

    this.logger.debug(`Expected: ${expectedSignature}`);
    this.logger.debug(`Provided: ${signature}`);

    const providedBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      this.logger.warn('Invalid webhook signature');
      return { received: false };
    }

    // 2. Process event
    const payload = req.body as OpenwaWebhookPayload;
    if (!payload || typeof payload !== 'object' || !payload.data) {
      this.logger.warn('Malformed OpenWA webhook payload: missing data');
      return { received: false };
    }

    const messageId = payload.data.messageId || payload.data.id;
    const sender =
      payload.data.sender ||
      payload.data.from ||
      payload.data.senderPhone ||
      payload.data.author;
    const chatId = payload.data.chatId || sender;

    this.logger.debug(`Received webhook: ${payload.event}`, {
      sessionId: payload.sessionId,
      messageId,
      chatId,
    });

    await this.routeEvent(payload);

    return { received: true };
  }

  private async routeEvent(payload: OpenwaWebhookPayload): Promise<void> {
    switch (payload.event) {
      case 'message.received':
        await this.handleIncomingMessage(payload.data);
        break;
      case 'message.sent':
        this.logger.log(`Message sent confirmed: ${payload.data.messageId || payload.data.id}`);
        break;
      case 'message.ack':
        this.logger.debug(`Message ack: ${payload.data.messageId || payload.data.id} - ${payload.data.ack}`);
        break;
      case 'session.status':
        this.logger.log(`Session status: ${payload.data.status}`);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${payload.event}`);
    }
  }

  private async handleIncomingMessage(data: OpenwaWebhookPayload['data']): Promise<void> {
    const messageId = data.messageId || data.id || '';
    const sender = data.sender || data.from || data.senderPhone || data.author || '';
    const chatId = data.chatId || sender;

    this.logger.log(`Incoming message from ${sender || 'unknown'} in ${chatId || 'unknown'}: ${data.body?.slice(0, 100)}`);

    if (this.poApprovalService) {
      try {
        await this.poApprovalService.handleIncomingWhatsappMessage({
          ...data,
          messageId,
          sender,
          chatId,
        });
      } catch (err) {
        this.logger.error(
          `Failed to process incoming WhatsApp PO approval message ${messageId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}