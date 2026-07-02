import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDetails, woBasicDetails, woAmendments, woContacts, woAcceptance } from '@db/schemas/operations';
import type { WoAcceptanceDecisionDto } from './dto/wo-acceptance.dto';

@Injectable()
export class WoAcceptanceService {
  private readonly logger = new Logger(WoAcceptanceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DbInstance,
  ) {}

  async getAcceptanceDetails(woDetailId: number) {
    const [detail] = await this.db
      .select({
        id: woDetails.id,
        woBasicDetailId: woDetails.woBasicDetailId,
        projectName: woBasicDetails.projectName,
        woNumber: woBasicDetails.woNumber,
        projectCode: woBasicDetails.projectCode,
        clientName: woBasicDetails.projectName,
        status: woDetails.status,
      })
      .from(woDetails)
      .leftJoin(woBasicDetails, eq(woDetails.woBasicDetailId, woBasicDetails.id))
      .where(eq(woDetails.id, woDetailId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${woDetailId} not found`);
    }

    const [acceptance] = await this.db
      .select()
      .from(woAcceptance)
      .where(eq(woAcceptance.woDetailId, woDetailId))
      .limit(1);

    const contacts = await this.db
      .select()
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, detail.woBasicDetailId));

    const oeAmendments = await this.db
      .select()
      .from(woAmendments)
      .where(
        and(
          eq(woAmendments.woDetailId, woDetailId),
          eq(woAmendments.createdByRole, 'OE')
        )
      )
      .orderBy(desc(woAmendments.createdAt));

    return {
      detail,
      acceptance: acceptance ?? null,
      contacts,
      oeAmendments,
    };
  }

  async processDecision(woDetailId: number, data: WoAcceptanceDecisionDto, userId: number) {
    const { decision, remarks, amendments, initiateFollowUp, oeSiteVisitId, oeDocsPrepId, signedWoFilePath } = data;

    const [acceptance] = await this.db
      .select()
      .from(woAcceptance)
      .where(eq(woAcceptance.woDetailId, woDetailId))
      .limit(1);

    if (!acceptance) {
      throw new NotFoundException(`Acceptance record for WO Detail ${woDetailId} not found`);
    }

    const now = new Date();

    if (decision === 'amendment_needed') {
      return this.handleAmendmentNeeded(woDetailId, acceptance.id, data, userId, now);
    } else {
      return this.handleAccepted(woDetailId, acceptance.id, data, userId, now);
    }
  }

  private async handleAmendmentNeeded(woDetailId: number, acceptanceId: number, data: WoAcceptanceDecisionDto, userId: number, now: Date) {
    return await this.db.transaction(async (tx) => {
      // 1. Update Acceptance status
      await tx
        .update(woAcceptance)
        .set({
          decision: 'amendment_needed',
          decisionRemarks: data.remarks,
          status: 'awaiting_amendment',
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(woAcceptance.id, acceptanceId));

      // 2. Create Bulk Amendments if provided
      if (data.amendments && data.amendments.length > 0) {
        // We use the service but pass the transaction if possible,
        // or just perform the inserts here for simplicity within tx.
        const amendmentInserts = data.amendments.map(a => ({
          woDetailId,
          createdByRole: 'TL' as const,
          pageNo: a.pageNo,
          clauseNo: a.clauseNo,
          currentStatement: a.currentStatement,
          correctedStatement: a.correctedStatement,
          status: 'submitted' as const, // TL amendments are pre-approved
          tlApproved: true,
          tlReviewedAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        }));
        await tx.insert(woAmendments).values(amendmentInserts);
      }

      // 3. Initiate Follow-up if requested

      // 4. Update WO Detail status
      await tx
        .update(woDetails)
        .set({
          status: 'in_progress', // Move back to in progress for OE to fix
          updatedAt: now,
        })
        .where(eq(woDetails.id, woDetailId));

      return { message: 'WO marked for amendment' };
    });
  }

  private async handleAccepted(woDetailId: number, acceptanceId: number, data: WoAcceptanceDecisionDto, userId: number, now: Date) {
    return await this.db.transaction(async (tx) => {
      // 1. Update Acceptance record
      await tx
        .update(woAcceptance)
        .set({
          decision: 'accepted',
          decisionRemarks: data.remarks,
          status: 'pending_signatures', // Next step
          acceptedAt: now,
          finalDecisionAt: now,
          signedWoFilePath: data.signedWoFilePath,
          signedWoUploadedAt: data.signedWoFilePath ? now : null,
          signedWoUploadedBy: data.signedWoFilePath ? userId : null,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(woAcceptance.id, acceptanceId));

      // 2. Update WO Basic Details (OE assignments)
      const detailUpdate: any = { updatedAt: now };
      if (data.oeSiteVisitId) {
        detailUpdate.oeSiteVisit = data.oeSiteVisitId;
        detailUpdate.oeSiteVisitAssignedAt = now;
        detailUpdate.oeSiteVisitAssignedBy = userId;
      }
      if (data.oeDocsPrepId) {
        detailUpdate.oeDocsPrep = data.oeDocsPrepId;
        detailUpdate.oeDocsPrepAssignedAt = now;
        detailUpdate.oeDocsPrepAssignedBy = userId;
      }

      const [woDetail] = await tx
        .select({ woBasicDetailId: woDetails.woBasicDetailId })
        .from(woDetails)
        .where(eq(woDetails.id, woDetailId))
        .limit(1);

      if (woDetail) {
        await tx
          .update(woBasicDetails)
          .set(detailUpdate)
          .where(eq(woBasicDetails.id, woDetail.woBasicDetailId));
      }

      // 3. Apply Digital Signature
      await tx
        .update(woAcceptance)
        .set({
          tlSignedAt: now,
          tlSignedBy: userId,
          // tlSignatureFilePath would be set
        })
        .where(eq(woAcceptance.id, acceptanceId));

      // 4. Trigger Emails and Courier in background (non-blocking)
      // 4.1. Send SAP PO Follow-up Email
      // This would normally use a template and resolve recipients
      // 4.2. Create Courier Request
      // Fetch details for courier

      return { message: 'WO accepted successfully' };
    });
  }
}
