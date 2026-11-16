import { Injectable } from '@nestjs/common';
import { BgCoveringLetterService } from './bg-covering-letter.service';
import type { BgCoveringLetterData } from './bg-covering-letter.service';
import { BgPrefilledApplicationService } from './bg-prefilled-application.service';
import type { BgPrefilledApplicationData } from './bg-prefilled-application.service';
import { BgAuthorizationLetterService } from './bg-authorization-letter.service';
import type { BgAuthorizationLetterData } from './bg-authorization-letter.service';

export type { BgCoveringLetterData, BgPrefilledApplicationData, BgAuthorizationLetterData };

/**
 * Facade for the BG letter DOCX files generated when the create-request mail is
 * sent. The actual builders live in one service per letter so each document can
 * evolve independently; all of them share `BgDocxBase` (letterhead, footer,
 * watermark, save helper).
 */
@Injectable()
export class DocxService {
    constructor(
        private readonly coveringLetterService: BgCoveringLetterService,
        private readonly prefilledApplicationService: BgPrefilledApplicationService,
        private readonly authorizationLetterService: BgAuthorizationLetterService,
    ) {}

    /** "Submission and SFMS Confirmation of Bank Guarantee" letter. */
    buildCoveringLetter(data: BgCoveringLetterData, instrumentId: number): Promise<string> {
        return this.coveringLetterService.buildCoveringLetter(data, instrumentId);
    }

    /** Prefilled AU Bank "Application for Bank Guarantee Issuance". */
    buildPrefilledApplication(data: BgPrefilledApplicationData, instrumentId: number): Promise<string> {
        return this.prefilledApplicationService.buildPrefilledApplication(data, instrumentId);
    }

    /** "Authorization Letter for receiving of Bank Guarantee". */
    buildAuthorizationLetter(data: BgAuthorizationLetterData, instrumentId: number): Promise<string> {
        return this.authorizationLetterService.buildAuthorizationLetter(data, instrumentId);
    }
}
