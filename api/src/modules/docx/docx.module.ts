import { Module } from '@nestjs/common';
import { DocxService } from './docx.service';
import { BgCoveringLetterService } from './bg-covering-letter.service';
import { BgPrefilledApplicationService } from './bg-prefilled-application.service';
import { BgAuthorizationLetterService } from './bg-authorization-letter.service';

/**
 * DOCX generation for the BG letters that are attached to outgoing mails.
 *
 * Each letter is its own service so the documents can evolve independently;
 * `DocxService` is the single entry point for consumers. All letters share the
 * letterhead/footer/watermark plumbing in `BgDocxBase`.
 */
@Module({
    providers: [
        DocxService,
        BgCoveringLetterService,
        BgPrefilledApplicationService,
        BgAuthorizationLetterService,
    ],
    exports: [DocxService],
})
export class DocxModule {}
