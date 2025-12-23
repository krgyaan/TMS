import { Injectable, BadRequestException } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";
import type { GoogleConnection } from "@/modules/integrations/google/google.service";
import type { SendMailInput } from "./zod/send-mail.schema";
import googleConfig from "@config/google.config";
import { renderTemplateFromPath } from "./template-renderer";
import { statSync, existsSync } from "fs";
import { basename, join, normalize } from "path";

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
    private resolveAttachments(input?: { files: string | string[]; baseDir?: string }) {
        if (!input?.files) return [];

        const files = Array.isArray(input.files) ? input.files : [input.files];
        const uploadsRoot = join(process.cwd(), "uploads");

        let totalSize = 0;

        const attachments = files.map(file => {
            const safeName = normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");

            const relativePath = input.baseDir ? join(input.baseDir, safeName) : safeName; // fallback for legacy full paths

            const absolutePath = join(uploadsRoot, relativePath);

            if (!existsSync(absolutePath)) {
                throw new BadRequestException(`Attachment not found on disk: ${relativePath}`);
            }

            const stats = statSync(absolutePath);
            totalSize += stats.size;

            return {
                filename: basename(absolutePath),
                path: absolutePath,
                size: stats.size,
            };
        });

        if (totalSize > 25 * 1024 * 1024) {
            throw new BadRequestException(`Total attachment size exceeds 25MB`);
        }

        return attachments.map(({ size, ...rest }) => rest);
    }
    async sendAsUser(payload: SendMailInput, connection: GoogleConnection) {
        if (!connection.hasRefreshToken) {
            throw new BadRequestException("Google account does not have offline access");
        }

        if (!connection.providerEmail) {
            throw new BadRequestException("Google account email not available");
        }

        // Create OAuth client (same client used by GoogleService)
        const oauth2Client = new google.auth.OAuth2(googleConfig().clientId, googleConfig().clientSecret);

        // ✅ THIS IS THE FIX
        oauth2Client.setCredentials({
            refresh_token: (connection as any).refreshToken,
        });
        // IMPORTANT: use refresh token from DB
        (oauth2Client as any).credentials.refresh_token = (connection as any).refreshToken;

        const accessToken = await oauth2Client.getAccessToken();

        if (!accessToken?.token) {
            throw new BadRequestException("Failed to refresh Gmail access token");
        }

        console.log("Obtained new access token for user", connection.id);

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
        console.log("Resolved attachments for email final path:", resolvedAttachments);

        return transporter.sendMail({
            from: `"${connection.providerEmail}" <${connection.providerEmail}>`,
            to: payload.to.join(", "),
            cc: payload.cc?.join(", "),
            bcc: payload.bcc?.join(", "),
            replyTo: payload.replyTo,
            subject: payload.subject,
            html: payload.html,
            attachments: resolvedAttachments,
        });
    }

    async sendTemplateAsUser(
        template: {
            name: string;
            basePath: string;
        },
        context: Record<string, any>,
        meta: MailMeta,
        connection: GoogleConnection
    ) {
        const html = renderTemplateFromPath(template.basePath, template.name, context);

        return this.sendAsUser(
            {
                senderUserId: connection.userId,
                to: meta.to,
                cc: meta?.cc,
                bcc: meta?.bcc,
                subject: meta.subject,
                html,
                attachments: meta.attachments,
            },
            connection
        );
    }
}
