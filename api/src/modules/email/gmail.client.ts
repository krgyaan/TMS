import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DRIZZLE } from '@db/database.module';
import { oauthAccounts, emailLabels, emailThreads } from '@/db/schemas';
import { ResolvedEmail, SendResult } from './dto/send-email.dto';
import type { DbInstance } from '@/db';
import * as fs from 'fs';


type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

@Injectable()
export class GmailClient {
    private readonly logger = new Logger(GmailClient.name);
    private readonly domain: string;
    private oauth2Client: OAuth2Client;

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly config: ConfigService,
    ) {
        this.domain = this.config.get('EMAIL_DOMAIN', 'yourdomain.com');
        this.oauth2Client = new google.auth.OAuth2(
            this.config.get('GOOGLE_CLIENT_ID'),
            this.config.get('GOOGLE_CLIENT_SECRET'),
            this.config.get('GOOGLE_REDIRECT_URI'),
        ) as OAuth2Client;
    }

    /**
     * Generate unique Message-ID
     */
    generateMessageId(): string {
        return `<${uuidv4()}@${this.domain}>`;
    }

    /**
     * Get valid OAuth token for user (refreshes if needed)
     */
    async getValidToken(userId: number): Promise<{ accessToken: string; email: string } | null> {
        const account = await this.db
            .select()
            .from(oauthAccounts)
            .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, 'google')))
            .limit(1);

        if (!account.length) {
            this.logger.warn(`No OAuth account for user ${userId}`);
            return null;
        }

        const oauth = account[0];

        // Check if token expired (with 5 min buffer)
        const now = new Date();
        const expiresAt = oauth.expiresAt ? new Date(oauth.expiresAt) : null;
        const isExpired = !expiresAt || expiresAt.getTime() - 5 * 60 * 1000 < now.getTime();

        if (isExpired && oauth.refreshToken) {
            return this.refreshToken(oauth);
        }

        return {
            accessToken: oauth.accessToken,
            email: oauth.providerEmail || '',
        };
    }

    /**
     * Refresh expired OAuth token
     */
    private async refreshToken(
        oauth: typeof oauthAccounts.$inferSelect,
    ): Promise<{ accessToken: string; email: string } | null> {
        try {
            this.oauth2Client.setCredentials({ refresh_token: oauth.refreshToken });
            const { credentials } = await this.oauth2Client.refreshAccessToken();

            if (!credentials.access_token) {
                this.logger.error(`Token refresh succeeded but no access_token for user ${oauth.userId}`);
                return null;
            }

            // Update in database
            await this.db
                .update(oauthAccounts)
                .set({
                    accessToken: credentials.access_token,
                    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                    updatedAt: new Date(),
                })
                .where(eq(oauthAccounts.id, oauth.id));

            this.logger.log(`Refreshed token for user ${oauth.userId}`);

            return {
                accessToken: credentials.access_token,
                email: oauth.providerEmail || '',
            };
        } catch (error) {
            this.logger.error(`Token refresh failed for user ${oauth.userId}:`, error.message);
            return null;
        }
    }

    /**
     * Check if user has valid OAuth
     */
    async hasValidOAuth(userId: number): Promise<boolean> {
        const token = await this.getValidToken(userId);
        return token !== null;
    }

    /**
     * Get authenticated Gmail client for user
     */
    private async getGmailClient(userId: number): Promise<gmail_v1.Gmail | null> {
        const token = await this.getValidToken(userId);
        if (!token) return null;

        const auth = new google.auth.OAuth2(
            this.config.get('GOOGLE_CLIENT_ID'),
            this.config.get('GOOGLE_CLIENT_SECRET'),
            this.config.get('GOOGLE_REDIRECT_URI'),
        );
        auth.setCredentials({ access_token: token.accessToken });

        return google.gmail({ version: 'v1', auth });
    }

    /**
     * Send email via Gmail API
     */
    async send(userId: number, email: ResolvedEmail): Promise<SendResult> {
        const gmail = await this.getGmailClient(userId);
        if (!gmail) {
            return { success: false, error: 'No valid OAuth token. Please re-authenticate.' };
        }

        const attemptSend = async (emailForSend: ResolvedEmail, includeThread: boolean) => {
            // Build MIME message
            const mimeMessage = this.buildMimeMessage(emailForSend);
            const encodedMessage = Buffer.from(mimeMessage)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // Send request
            const sendParams: gmail_v1.Params$Resource$Users$Messages$Send = {
                userId: 'me',
                requestBody: { raw: encodedMessage },
            };

            // Add thread ID if replying and explicitly allowed
            if (includeThread && emailForSend.threadId) {
                sendParams.requestBody!.threadId = emailForSend.threadId;
            }

            const response = await gmail.users.messages.send(sendParams as any);
            const messageId = response.data.id;
            const threadId = response.data.threadId || undefined;

            this.logger.log(`Email sent: ${messageId || 'No message ID'}`);

            // Apply label
            if (emailForSend.labelPath && messageId) {
                await this.applyLabel(gmail, userId, messageId, emailForSend.labelPath);
            }

            return { success: true, messageId: messageId || undefined, threadId: threadId || undefined } as SendResult;
        };

        try {
            // First attempt: include thread information (if any)
            return await attemptSend(email, true);
        } catch (error: any) {
            const baseMessage = error?.message || String(error);
            const code = (error as any)?.code;
            const responseData = (error as any)?.response?.data;
            const apiError = responseData?.error;
            const apiErrorMessage =
                typeof apiError === 'string'
                    ? apiError
                    : apiError?.message || apiError?.status || '';

            const combinedMessage = apiErrorMessage || baseMessage;

            // Log structured error details for debugging
            this.logger.error(
                `Gmail send failed: code=${code ?? 'unknown'} message=${combinedMessage}`,
            );
            if (responseData) {
                this.logger.debug(`Gmail send error response: ${JSON.stringify(responseData)}`);
            }

            const messageForCheck = `${baseMessage} ${apiErrorMessage || ''}`.toLowerCase();
            const isNotFoundError =
                code === 404 ||
                code === '404' ||
                messageForCheck.includes('requested entity was not found') ||
                messageForCheck.includes('not found');

            // If Gmail reports that the referenced thread was not found, retry once without threadId
            if (email.threadId && isNotFoundError) {
                this.logger.warn(
                    `Gmail send failed due to invalid or stale threadId="${email.threadId}". Retrying without threadId to start a new conversation.`,
                );

                try {
                    const emailWithoutThread: ResolvedEmail = {
                        ...email,
                        threadId: undefined,
                        inReplyTo: undefined,
                    };
                    return await attemptSend(emailWithoutThread, false);
                } catch (retryError: any) {
                    const retryMessage = retryError?.message || String(retryError);
                    const retryCode = (retryError as any)?.code;
                    const retryResponseData = (retryError as any)?.response?.data;
                    const retryApiError = retryResponseData?.error;
                    const retryApiErrorMessage =
                        typeof retryApiError === 'string'
                            ? retryApiError
                            : retryApiError?.message || retryApiError?.status || '';

                    const finalMessage = retryApiErrorMessage || retryMessage || combinedMessage;

                    this.logger.error(
                        `Gmail retry without threadId failed: code=${retryCode ?? 'unknown'} message=${finalMessage}`,
                    );
                    if (retryResponseData) {
                        this.logger.debug(
                            `Gmail retry error response: ${JSON.stringify(retryResponseData)}`,
                        );
                    }

                    return { success: false, error: finalMessage || 'Gmail send failed.' };
                }
            }

            return { success: false, error: combinedMessage || 'Gmail send failed.' };
        }
    }

    /**
     * Build RFC 2822 MIME message
     */
    private buildMimeMessage(email: ResolvedEmail): string {
        const textBody = this.htmlToText(email.htmlBody);
        const hasAttachments = email.attachments && email.attachments.length > 0;
        const shouldLogMimeSummary = process.env.EMAIL_LOG_MIME === '1';
        const mimeDumpPath = process.env.EMAIL_LOG_MIME_FILE;

        // If no attachments, use simple multipart/alternative
        if (!hasAttachments) {
            const boundary = `----=_Part_${Date.now()}`;
            const headers = this.buildHeaders(email, `multipart/alternative; boundary="${boundary}"`);

            const parts = [
                headers.join('\r\n'),
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=UTF-8',
                '',
                textBody,
                `--${boundary}`,
                'Content-Type: text/html; charset=UTF-8',
                '',
                email.htmlBody,
                `--${boundary}--`,
            ];

            const message = parts.join('\r\n');

            if (shouldLogMimeSummary) {
                this.logger.debug(
                    `GmailClient.buildMimeMessage: built multipart/alternative message without attachments (subject="${email.subject}")`,
                );
            }

            if (shouldLogMimeSummary && mimeDumpPath) {
                try {
                    fs.writeFileSync(mimeDumpPath, message);
                } catch (e: any) {
                    this.logger.warn(`GmailClient.buildMimeMessage: failed to write MIME dump file: ${e?.message || e}`);
                }
            }

            return message;
        }

        // With attachments, use multipart/mixed with nested multipart/alternative
        const mixedBoundary = `----=_Mixed_${Date.now()}`;
        const altBoundary = `----=_Alternative_${Date.now()}`;

        const headers = this.buildHeaders(email, `multipart/mixed; boundary="${mixedBoundary}"`);

        const parts: string[] = [
            headers.join('\r\n'),
            '',
            `--${mixedBoundary}`,
            `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
            '',
            `--${altBoundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            '',
            textBody,
            `--${altBoundary}`,
            'Content-Type: text/html; charset=UTF-8',
            '',
            email.htmlBody,
            `--${altBoundary}--`,
        ];

        // Add attachments
        for (const attachment of email.attachments!) {
            const fileContent = fs.readFileSync(attachment.path);
            const base64Content = fileContent.toString('base64');
            const mimeType = this.getMimeType(attachment.filename);

            parts.push(
                `--${mixedBoundary}`,
                `Content-Type: ${mimeType}; name="${attachment.filename}"`,
                'Content-Disposition: attachment; filename="' + attachment.filename + '"',
                'Content-Transfer-Encoding: base64',
                '',
                base64Content,
            );
        }

        parts.push(`--${mixedBoundary}--`);

        const message = parts.join('\r\n');

        if (shouldLogMimeSummary) {
            const attachmentNames = email.attachments!.map(a => a.filename);
            this.logger.debug(
                `GmailClient.buildMimeMessage: built multipart/mixed message with ${attachmentNames.length} attachment(s): ${attachmentNames.join(
                    ', ',
                )}`,
            );
        }

        if (shouldLogMimeSummary && mimeDumpPath) {
            try {
                fs.writeFileSync(mimeDumpPath, message);
            } catch (e: any) {
                this.logger.warn(`GmailClient.buildMimeMessage: failed to write MIME dump file: ${e?.message || e}`);
            }
        }

        return message;
    }

    /**
     * Build email headers
     */
    private buildHeaders(email: ResolvedEmail, contentType: string): string[] {
        const headers = [
            `From: ${email.fromEmail}`,
            `To: ${email.toEmails.join(', ')}`,
        ];

        if (email.ccEmails.length > 0) {
            headers.push(`Cc: ${email.ccEmails.join(', ')}`);
        }

        headers.push(`Subject: ${email.subject}`);
        headers.push(`Message-ID: ${email.messageId}`);

        // Threading headers
        if (email.inReplyTo) {
            headers.push(`In-Reply-To: ${email.inReplyTo}`);
            headers.push(`References: ${email.inReplyTo}`);
        }

        headers.push('MIME-Version: 1.0');
        headers.push(`Content-Type: ${contentType}`);

        return headers;
    }

    /**
     * Get MIME type for file
     */
    private getMimeType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            txt: 'text/plain',
            csv: 'text/csv',
        };
        return mimeTypes[ext || ''] || 'application/octet-stream';
    }

    /**
     * Simple HTML to text conversion
     */
    private htmlToText(html: string): string {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Get or create Gmail label
     */
    async getOrCreateLabel(
        gmail: gmail_v1.Gmail,
        userId: number,
        labelPath: string,
    ): Promise<string | null> {
        // Check cache
        const cached = await this.db
            .select()
            .from(emailLabels)
            .where(and(eq(emailLabels.userId, userId), eq(emailLabels.labelName, labelPath)))
            .limit(1);

        if (cached.length > 0) {
            return cached[0].gmailLabelId || null;
        }

        // Create nested labels
        try {
            const labelId = await this.createNestedLabel(gmail, labelPath);

            if (labelId) {
                await this.db
                    .insert(emailLabels)
                    .values({ userId, labelName: labelPath, gmailLabelId: labelId || '' })
                    .onConflictDoUpdate({
                        target: [emailLabels.userId, emailLabels.labelName],
                        set: { gmailLabelId: labelId || '' },
                    });
            }

            return labelId;
        } catch (error) {
            this.logger.error('Failed to create label:', error.message);
            return null;
        }
    }

    /**
     * Create nested labels (e.g., Tendering/AC/TenderName)
     */
    private async createNestedLabel(
        gmail: gmail_v1.Gmail,
        labelPath: string,
    ): Promise<string | null> {
        const parts = labelPath.split('/');
        let currentPath = '';
        let lastLabelId: string | null = null;

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            // Check if exists
            const existingId = await this.findLabelByName(gmail, currentPath);

            if (existingId) {
                lastLabelId = existingId;
            } else {
                try {
                    const response = await gmail.users.labels.create({
                        userId: 'me',
                        requestBody: {
                            name: currentPath,
                            labelListVisibility: 'labelShow',
                            messageListVisibility: 'show',
                        },
                    });
                    lastLabelId = response.data.id || null;
                } catch (error) {
                    if (error.code === 409) {
                        // Already exists (race condition)
                        lastLabelId = await this.findLabelByName(gmail, currentPath);
                    } else {
                        throw error;
                    }
                }
            }
        }

        return lastLabelId;
    }

    /**
     * Find label by name
     */
    private async findLabelByName(
        gmail: gmail_v1.Gmail,
        labelName: string,
    ): Promise<string | null> {
        const response = await gmail.users.labels.list({ userId: 'me' });
        const found = response.data.labels?.find((l) => l.name === labelName);
        return found?.id || null;
    }

    /**
     * Apply label to message
     */
    private async applyLabel(
        gmail: gmail_v1.Gmail,
        userId: number,
        messageId: string,
        labelPath: string,
    ): Promise<void> {
        const labelId = await this.getOrCreateLabel(gmail, userId, labelPath);
        if (!labelId) return;

        try {
            await gmail.users.messages.modify({
                userId: 'me',
                id: messageId,
                requestBody: { addLabelIds: [labelId] },
            });
        } catch (error) {
            this.logger.warn('Failed to apply label:', error.message);
        }
    }

    /**
     * Get thread info for reference
     */
    async getThreadInfo(
        referenceType: string,
        referenceId: number,
    ): Promise<{ threadId?: string; inReplyTo?: string; isNew: boolean }> {
        const existing = await this.db
            .select()
            .from(emailThreads)
            .where(
                and(
                    eq(emailThreads.referenceType, referenceType),
                    eq(emailThreads.referenceId, referenceId),
                ),
            )
            .limit(1);

        if (existing.length > 0) {
            return {
                threadId: existing[0].gmailThreadId || undefined,
                inReplyTo: existing[0].messageId || undefined,
                isNew: false,
            };
        }

        return { isNew: true };
    }

    /**
     * Save thread info after first email
     */
    async saveThreadInfo(
        referenceType: string,
        referenceId: number,
        gmailThreadId: string,
        messageId: string,
    ): Promise<void> {
        await this.db
            .insert(emailThreads)
            .values({ referenceType, referenceId, gmailThreadId: gmailThreadId || '', messageId: messageId || '' })
            .onConflictDoUpdate({
                target: [emailThreads.referenceType, emailThreads.referenceId],
                set: { gmailThreadId: gmailThreadId || '', messageId: messageId || '', updatedAt: new Date() },
            });
    }

    /**
     * Find internal users (those with OAuth) from email list
     */
    async findInternalUserIds(emails: string[]): Promise<number[]> {
        if (emails.length === 0) return [];

        const results = await this.db
            .select({ userId: oauthAccounts.userId, email: oauthAccounts.providerEmail })
            .from(oauthAccounts)
            .where(eq(oauthAccounts.provider, 'google'));

        const emailSet = new Set(emails.map((e) => e.toLowerCase()));
        return results
            .filter((r) => emailSet.has(r.email?.toLowerCase() || ''))
            .map((r) => r.userId);
    }

    /**
     * Apply label to recipient's mailbox (if they have OAuth)
     */
    async applyLabelToRecipient(
        recipientUserId: number,
        senderMessageId: string,
        labelPath: string,
    ): Promise<void> {
        const gmail = await this.getGmailClient(recipientUserId);
        if (!gmail) {
            // No OAuth - expected, skip silently
            return;
        }

        // Wait for message to arrive
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
            // Search for the message
            const cleanMsgId = senderMessageId.replace(/[<>]/g, '');
            const searchResponse = await gmail.users.messages.list({
                userId: 'me',
                q: `rfc822msgid:${cleanMsgId}`,
                maxResults: 1,
            });

            const messages = searchResponse.data.messages || [];
            if (messages.length > 0) {
                const labelId = await this.getOrCreateLabel(gmail, recipientUserId, labelPath);
                if (labelId) {
                    await gmail.users.messages.modify({
                        userId: 'me',
                        id: messages[0].id || '',
                        requestBody: { addLabelIds: [labelId] },
                    });
                }
            }
        } catch (error: any) {
            const errorMessage = error?.message || String(error);

            // Distinguish between error types
            if (errorMessage.includes('Insufficient Permission') ||
                errorMessage.includes('insufficient') ||
                errorMessage.includes('permission')) {
                // Permission denied - expected if recipient hasn't granted full access
                this.logger.debug(`Could not label recipient mailbox (permission denied): User ${recipientUserId} may need to grant additional Gmail permissions`);
            } else if (errorMessage.includes('Not Found') || errorMessage.includes('not found')) {
                // Message not found yet - might need more time
                this.logger.debug(`Could not label recipient mailbox (message not found): Message may not have arrived yet for user ${recipientUserId}`);
            } else {
                // Other errors - log as warning
                this.logger.warn(`Could not label recipient mailbox for user ${recipientUserId}: ${errorMessage}`);
            }
        }
    }
}
