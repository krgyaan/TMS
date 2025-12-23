import { Body, Controller, Post, BadRequestException } from "@nestjs/common";
import { MailerService } from "./mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { SendMailSchema } from "./zod/send-mail.schema";

@Controller("mail")
export class MailerController {
    constructor(
        private readonly mailerService: MailerService,
        private readonly googleService: GoogleService
    ) {}

    @Post("send")
    async send(@Body() body: unknown) {
        const parsed = SendMailSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        const { senderUserId, ...mailPayload } = parsed.data;

        const connection = await this.googleService.getSanitizedGoogleConnection(parsed.data.senderUserId);

        if (!connection) {
            throw new BadRequestException("Google account not connected");
        }

        // normalize scopes safely
        const scopes = connection.scopes ?? [];
        const hasGmailScope = scopes.includes("https://mail.google.com/");

        if (!hasGmailScope) {
            throw new BadRequestException("Google account does not have Gmail permission");
        }

        await this.mailerService.sendAsUser(parsed.data, connection);

        return {
            success: true,
            message: "Mail sent successfully",
        };
    }
}
