// src/modules/mailer/mailer.service.ts
import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailerService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }

    async sendMail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
        return await this.transporter.sendMail({
            from: `"MyApp" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
    }
}
