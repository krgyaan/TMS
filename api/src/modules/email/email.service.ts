import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { eq, and, lt, sql, isNotNull, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import { emailLogs, tenderInfos } from '@/db/schemas';
import { GmailClient } from './gmail.client';
import { RecipientResolver } from './recipient.resolver';
import {
    SendEmailOptions,
    SendTenderEmailOptions,
    ResolvedEmail,
    EmailStatus,
} from './dto/send-email.dto';
import type { DbInstance } from '@/db';
import { normalize } from 'path';
import { basename, join } from 'path';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly templatesDir: string;
    private readonly maxRetries: number;
    private readonly isProd: boolean;

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly gmail: GmailClient,
        private readonly recipientResolver: RecipientResolver,
        private readonly config: ConfigService,
    ) {
        this.isProd = this.config.get('NODE_ENV') === 'production';
        const rootDir = this.isProd ? 'dist' : 'src';
        this.templatesDir = path.join(process.cwd(), rootDir, 'modules', 'email', 'templates');
        this.maxRetries = this.config.get('EMAIL_MAX_RETRIES', 2);
        this.registerHandlebarsHelpers();
    }

    /**
     * Register Handlebars helpers
     */
    private registerHandlebarsHelpers() {
        Handlebars.registerHelper('formatDate', (date: Date | string) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        });

        Handlebars.registerHelper('formatCurrency', (amount: number) => {
            if (amount == null) return '';
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
            }).format(amount);
        });

        Handlebars.registerHelper('eq', (a, b) => a === b);
        Handlebars.registerHelper('ne', (a, b) => a !== b);
        Handlebars.registerHelper('or', (a, b) => a || b);
        Handlebars.registerHelper('and', (a, b) => a && b);
    }

    /**
     * Render template with data
     */
    private renderTemplate(templateName: string, data: Record<string, any>): string {
        const templatePath = path.join(this.templatesDir, templateName.endsWith('.hbs') ? templateName : `${templateName}.hbs`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        return template(data);
    }

    /**
     * Resolve attachment file paths
     */
    private resolveAttachments(input: { files: string[]; baseDir?: string }): Array<{ filename: string; path: string }> {
        const uploadsRoot = join(process.cwd(), 'uploads');
        const attachments: Array<{ filename: string; path: string }> = [];

        for (const file of input.files) {
            const safeName = normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');
            const relativePath = input.baseDir ? join(input.baseDir, safeName) : safeName;
            const absolutePath = join(uploadsRoot, relativePath);

            if (!fs.existsSync(absolutePath)) {
                this.logger.warn(`Attachment not found on disk: ${relativePath}`);
                continue;
            }

            attachments.push({
                filename: basename(absolutePath),
                path: absolutePath,
            });
        }

        return attachments;
    }

    /**
     * Generate label path for tender
     */
    private generateTenderLabelPath(teamName: string, tenderName: string): string {
        const sanitize = (str: string) => str.replace(/[\/\\:*?"<>|]/g, '-').trim();
        return `Tendering/${sanitize(teamName)}/${sanitize(tenderName)}`;
    }

    /**
     * Main send method - queues email and sends async
     */
    async send(options: SendEmailOptions): Promise<{ success: boolean; emailLogId?: number; error?: string }> {
        try {
            // 1. Check sender OAuth
            const hasOAuth = await this.gmail.hasValidOAuth(options.fromUserId);
            if (!hasOAuth) {
                return { success: false, error: 'Sender needs to authenticate with Google.' };
            }

            // 2. Get sender info
            const sender = await this.recipientResolver.getUserById(options.fromUserId);
            if (!sender) {
                return { success: false, error: 'Sender not found.' };
            }

            // 3. Resolve recipients
            const [toEmails, ccEmailsResolved] = await Promise.all([
                this.recipientResolver.resolveAll(options.to),
                options.cc ? this.recipientResolver.resolveAll(options.cc) : [],
            ]);

            if (toEmails.length === 0) {
                return { success: false, error: 'No valid recipients.' };
            }

            // 4. Handle CC/BCC in non-production: log but don't send
            let ccEmails = ccEmailsResolved;
            if (!this.isProd && ccEmailsResolved.length > 0) {
                this.logger.log(`[NON-PROD] CC recipients (logged, not sent): ${ccEmailsResolved.join(', ')}`);
                ccEmails = []; // Don't send CC in non-production
            }

            // 5. Render template
            const htmlBody = this.renderTemplate(options.template, {
                data: {
                    ...options.data,
                    senderName: sender.name,
                }
            });

            // 5.5. Process attachments if provided
            let resolvedAttachments: Array<{ filename: string; path: string }> | undefined;
            if (options.attachments && options.attachments.files.length > 0) {
                resolvedAttachments = this.resolveAttachments(options.attachments);
            }

            // 6. Get thread info
            const threadInfo = await this.gmail.getThreadInfo(
                options.referenceType,
                options.referenceId,
            );

            // 7. Generate message ID
            const messageId = this.gmail.generateMessageId();

            // 8. Create email log (status: pending)
            // Save original CC emails to log even if not sending in non-prod
            const [log] = await this.db
                .insert(emailLogs)
                .values({
                    referenceType: options.referenceType,
                    referenceId: options.referenceId,
                    eventType: options.eventType,
                    fromUserId: options.fromUserId,
                    fromEmail: sender.email,
                    toEmails,
                    ccEmails: ccEmailsResolved,
                    subject: options.subject,
                    templateName: options.template,
                    templateData: options.data,
                    bodyHtml: htmlBody,
                    labelPath: options.labelPath || undefined,
                    status: 'pending',
                })
                .returning({ id: emailLogs.id });

            const emailLogId = log.id;

            // 9. Send email (async - fire and forget)
            // Use filtered CC emails (empty in non-prod)
            this.sendEmailAsync({
                emailLogId,
                fromUserId: options.fromUserId,
                resolved: {
                    fromEmail: sender.email,
                    fromUserId: options.fromUserId,
                    toEmails,
                    ccEmails, // Will be empty in non-prod
                    subject: options.subject,
                    htmlBody,
                    labelPath: options.labelPath || '',
                    threadId: threadInfo.threadId || undefined,
                    inReplyTo: threadInfo.inReplyTo || undefined,
                    messageId,
                    attachments: resolvedAttachments,
                },
                referenceType: options.referenceType || '',
                referenceId: options.referenceId || 0,
                isNewThread: threadInfo.isNew,
            });

            return { success: true, emailLogId };
        } catch (error) {
            this.logger.error('Email send failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Async email sending (non-blocking)
     */
    private async sendEmailAsync(params: {
        emailLogId: number;
        fromUserId: number;
        resolved: ResolvedEmail;
        referenceType: string;
        referenceId: number;
        isNewThread: boolean;
    }): Promise<void> {
        const { emailLogId, fromUserId, resolved, referenceType, referenceId, isNewThread } = params as { emailLogId: number; fromUserId: number; resolved: ResolvedEmail; referenceType: string; referenceId: number; isNewThread: boolean };

        try {
            // Update status to sending
            await this.db
                .update(emailLogs)
                .set({ status: 'sending', attempts: sql`${emailLogs.attempts} + 1`, lastAttemptAt: new Date() })
                .where(eq(emailLogs.id, emailLogId));

            // Send via Gmail
            const result = await this.gmail.send(fromUserId, resolved);

            if (result.success) {
                // Update log as sent
                await this.db
                    .update(emailLogs)
                    .set({
                        status: 'sent',
                        gmailMessageId: result.messageId,
                        gmailThreadId: result.threadId,
                        sentAt: new Date(),
                    })
                    .where(eq(emailLogs.id, emailLogId));

                // Save thread info
                if (isNewThread && result.threadId) {
                    await this.gmail.saveThreadInfo(
                        referenceType,
                        referenceId,
                        result.threadId,
                        resolved.messageId,
                    );
                }

                // Apply labels to internal recipients
                await this.labelInternalRecipients(resolved, fromUserId);

                this.logger.log(`Email sent: ${emailLogId}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.logger.error(`Email ${emailLogId} failed:`, error.message);

            // Update log as failed
            await this.db
                .update(emailLogs)
                .set({ status: 'failed', errorMessage: error.message })
                .where(eq(emailLogs.id, emailLogId));
        }
    }

    /**
     * Apply labels to internal recipients' mailboxes
     */
    private async labelInternalRecipients(
        resolved: ResolvedEmail,
        senderUserId: number,
    ): Promise<void> {
        if (!resolved.labelPath) return;

        const allRecipients = [...resolved.toEmails, ...resolved.ccEmails];
        const internalUserIds = await this.gmail.findInternalUserIds(allRecipients);

        // Remove sender from list (already labeled)
        const otherUsers = internalUserIds.filter((id) => id !== senderUserId);

        for (const userId of otherUsers) {
            this.gmail
                .applyLabelToRecipient(userId, resolved.messageId, resolved.labelPath)
                .catch((err) => this.logger.debug(`Label failed for user ${userId}:`, err.message));
        }
    }

    /**
     * Convenience method for tender emails
     */
    async sendTenderEmail(options: SendTenderEmailOptions): Promise<{ success: boolean; emailLogId?: number; error?: string }> {
        // Get tender info for team
        const tender = await this.db
            .select({ teamId: tenderInfos.team, tenderName: tenderInfos.tenderName })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, options.tenderId))
            .limit(1);

        if (!tender.length) {
            return { success: false, error: 'Tender not found.' };
        }

        const teamId = tender[0].teamId;
        const teamName = this.recipientResolver.getTeamName(teamId);
        const tenderName = tender[0].tenderName;

        // Generate label path
        const labelPath = this.generateTenderLabelPath(teamName, tenderName);

        return this.send({
            referenceType: 'tender',
            referenceId: options.tenderId,
            eventType: options.eventType,
            fromUserId: options.fromUserId,
            to: options.to,
            cc: options.cc,
            subject: options.subject,
            template: options.template,
            data: {
                ...options.data,
                teamName,
                tenderName,
            },
            labelPath,
            attachments: options.attachments,
        });
    }

    /**
     * Retry failed emails (called by CRON)
     */
    async retryFailedEmails(): Promise<{ retried: number; failed: number }> {
        // Get failed emails with attempts < maxRetries
        // Handle NULL attempts by treating them as 0 using COALESCE
        const failedEmails = await this.db
            .select()
            .from(emailLogs)
            .where(
                and(
                    eq(emailLogs.status, 'failed'),
                    lt(sql`COALESCE(${emailLogs.attempts}, 0)`, this.maxRetries)
                )
            );

        let retried = 0;
        let failed = 0;

        for (const log of failedEmails) {
            try {
                // Get thread info
                const threadInfo = await this.gmail.getThreadInfo(log.referenceType || '', log.referenceId || 0);
                const messageId = this.gmail.generateMessageId() || '';

                // Retry send
                await this.sendEmailAsync({
                    emailLogId: log.id || 0,
                    fromUserId: log.fromUserId || 0,
                    resolved: {
                        fromEmail: log.fromEmail || '',
                        fromUserId: log.fromUserId || 0,
                        toEmails: log.toEmails as string[],
                        ccEmails: (log.ccEmails as string[]) || [],
                        subject: log.subject || '',
                        htmlBody: log.bodyHtml || '',
                        labelPath: log.labelPath || '',
                        threadId: threadInfo.threadId || undefined,
                        inReplyTo: threadInfo.inReplyTo || undefined,
                        messageId,
                    },
                    referenceType: log.referenceType || '',
                    referenceId: log.referenceId || 0,
                    isNewThread: threadInfo.isNew,
                });

                retried++;
            } catch (error) {
                failed++;
                this.logger.error(`Retry failed for email ${log.id}:`, error.message);
            }
        }

        if (retried > 0 || failed > 0) {
            this.logger.log(`Retry complete: ${retried} retried, ${failed} failed`);
        }

        return { retried, failed };
    }
}
