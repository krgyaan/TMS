import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";
import type { GoogleConnection } from "@/modules/integrations/google/google.service";
import type { SendMailInput } from "./zod/send-mail.schema";
import googleConfig from "@config/google.config";
import { renderTemplateFromPath } from "./template-renderer";
import { statSync, existsSync } from "fs";
import { basename, join, normalize } from "path";
import { GoogleService } from "@/modules/integrations/google/google.service";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

const UPLOADS_ROOT = join(process.cwd(), "uploads");
const MAX_GMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export interface MailMeta {
    to: string[];
    cc?: string[];
    bcc?: string[];

    subject: string;
    replyTo?: string;

    attachments?: {
        files: string | string[];
        baseDir?: string;
    };
}

@Injectable()
export class MailerService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        private readonly googleService: GoogleService
    ) {}

    // =====================================================
    // ATTACHMENT RESOLUTION
    // =====================================================
    private resolveAttachments(input?: { files: string | string[]; baseDir?: string }) {
        if (!input?.files) return [];

        const files = Array.isArray(input.files) ? input.files : [input.files];
        const uploadsRoot = join(process.cwd(), "uploads");

        let totalSize = 0;

        const attachments = files.map(file => {
            const safeName = normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");
            const relativePath = input.baseDir ? join(input.baseDir, safeName) : safeName;
            const absolutePath = join(uploadsRoot, relativePath);

            if (!existsSync(absolutePath)) {
                this.logger.error("Attachment not found on disk", { relativePath });
                throw new BadRequestException(`Attachment not found: ${relativePath}`);
            }

            const stats = statSync(absolutePath);
            totalSize += stats.size;

            return {
                filename: basename(absolutePath),
                path: absolutePath,
                size: stats.size,
            };
        });

        if (totalSize > MAX_GMAIL_ATTACHMENT_BYTES) {
            this.logger.error("Attachments exceed Gmail size limit", { totalSize });
            throw new BadRequestException(`Total attachment size exceeds 25MB`);
        }

        this.logger.debug("Attachments resolved", {
            count: attachments.length,
            totalSize,
        });

        return attachments.map(({ size, ...rest }) => rest);
    }

    // =====================================================
    // CORE SEND
    // =====================================================
    async sendAsUser(payload: SendMailInput, connection: GoogleConnection) {
        const isSandbox = process.env.MAIL_MODE === "sandbox";

        const finalTo = isSandbox ? [process.env.MAIL_SANDBOX_TO!] : payload.to;
        const finalCc = isSandbox ? [] : payload.cc;
        const finalBcc = isSandbox ? [] : payload.bcc;

        if (isSandbox) {
            this.logger.warn("SANDBOX MODE ACTIVE — overriding recipients", {
                originalTo: payload.to,
                sandboxTo: finalTo,
            });
        }

        if (!connection.hasRefreshToken) {
            this.logger.error("Google account missing refresh token", {
                userId: connection.userId,
            });
            throw new BadRequestException("Google account does not have offline access");
        }

        if (!connection.providerEmail) {
            this.logger.error("Google account email missing", {
                userId: connection.userId,
            });
            throw new BadRequestException("Google account email not available");
        }

        try {
            this.logger.debug("Creating OAuth client for Gmail", {
                userId: connection.userId,
            });

            const oauth2Client = new google.auth.OAuth2(googleConfig().clientId, googleConfig().clientSecret);

            oauth2Client.setCredentials({
                refresh_token: (connection as any).refreshToken,
            });

            const accessToken = await oauth2Client.getAccessToken();

            if (!accessToken?.token) {
                this.logger.error("Failed to obtain Gmail access token", {
                    userId: connection.userId,
                });
                throw new BadRequestException("Failed to refresh Gmail access token");
            }

            this.logger.debug("Gmail access token obtained", {
                userId: connection.userId,
            });

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: connection.providerEmail,
                    clientId: googleConfig().clientId,
                    clientSecret: googleConfig().clientSecret,
                    refreshToken: (connection as any).refreshToken,
                    accessToken: accessToken.token,
                },
            });

            const resolvedAttachments = payload.attachments ? this.resolveAttachments(payload.attachments) : undefined;

            this.logger.info("Sending email via Gmail", {
                from: connection.providerEmail,
                to: finalTo,
                cc: finalCc,
                bcc: finalBcc,
                subject: payload.subject,
                attachmentsCount: resolvedAttachments?.length ?? 0,
            });

            const result = await transporter.sendMail({
                from: `"${connection.providerEmail}" <${connection.providerEmail}>`,
                to: finalTo.join(", "),
                cc: finalCc?.join(", "),
                bcc: finalBcc?.join(", "),
                replyTo: payload.replyTo,
                subject: payload.subject,
                html: payload.html,
                attachments: resolvedAttachments,
            });

            this.logger.info("Email sent successfully", {
                messageId: result.messageId,
                response: result.response,
            });

            return result;
        } catch (error: any) {
            this.logger.error("Failed to send email", {
                error: error.message,
                stack: error.stack,
                subject: payload.subject,
            });
            throw error;
        }
    }

    // =====================================================
    // TEMPLATE ENTRY POINT
    // =====================================================
    async sendMail(template: { name: string; basePath: string }, context: Record<string, any>, meta: MailMeta, connection: GoogleConnection) {
        const isSandbox = process.env.MAIL_MODE === "sandbox";

        try {
            this.logger.debug("Rendering email template", {
                template: template.name,
            });

            const html = renderTemplateFromPath(template.basePath, template.name, context);

            this.logger.debug("Template rendered successfully", {
                template: template.name,
            });

            let finalConnection: GoogleConnection = connection;
            let finalMeta: MailMeta = meta;

            // ================= SANDBOX OVERRIDE =================
            if (isSandbox) {
                this.logger.warn("SANDBOX MODE ACTIVE — overriding sender and recipients", {
                    originalSenderUserId: connection.userId,
                    sandboxSenderUserId: 57,
                    originalTo: meta.to,
                    sandboxTo: process.env.MAIL_SANDBOX_TO,
                });

                const sandboxConnection = await this.googleService.getSanitizedGoogleConnection(57);

                if (!sandboxConnection) {
                    this.logger.error("Sandbox Google connection missing for user 57");
                    throw new Error("Sandbox Google connection not found");
                }

                finalConnection = sandboxConnection;

                finalMeta = {
                    ...meta,
                    to: [process.env.MAIL_SANDBOX_TO!],
                    cc: [],
                    bcc: [],
                };
            }

            return await this.sendAsUser(
                {
                    senderUserId: finalConnection.userId,
                    to: finalMeta.to,
                    cc: finalMeta.cc,
                    bcc: finalMeta.bcc,
                    subject: finalMeta.subject,
                    html,
                    attachments: finalMeta.attachments,
                },
                finalConnection
            );
        } catch (error: any) {
            this.logger.error("Failed during sendMail()", {
                template: template.name,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}
