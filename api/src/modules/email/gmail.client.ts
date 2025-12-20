import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DRIZZLE } from '@db/database.module';
import { oauthAccounts, emailLabels, emailThreads } from '@/db/schemas';
import { ResolvedEmail, SendResult } from './dto/send-email.dto';
import type { DbInstance } from '@/db';


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

        const auth = new OAuth2Client();
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

        try {
            // Build MIME message
            const mimeMessage = this.buildMimeMessage(email);
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

            // Add thread ID if replying
            if (email.threadId) {
                sendParams.requestBody!.threadId = email.threadId;
            }

            const response = await gmail.users.messages.send(sendParams as any);
            const messageId = response.data.id;
            const threadId = response.data.threadId || undefined;

            this.logger.log(`Email sent: ${messageId || 'No message ID'}`);

            // Apply label
            if (email.labelPath && messageId) {
                await this.applyLabel(gmail, userId, messageId, email.labelPath);
            }

            return { success: true, messageId: messageId || undefined, threadId: threadId || undefined };
        } catch (error) {
            this.logger.error('Gmail send failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Build RFC 2822 MIME message
     */
    private buildMimeMessage(email: ResolvedEmail): string {
        const boundary = `----=_Part_${Date.now()}`;

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
        headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
        headers.push('');

        const textBody = this.htmlToText(email.htmlBody);

        const parts = [
            headers.join('\r\n'),
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

        return parts.join('\r\n');
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
        if (!gmail) return;

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
        } catch (error) {
            this.logger.debug(`Could not label recipient mailbox: ${error.message}`);
        }
    }
}
