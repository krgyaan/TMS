import { z } from "zod";

// ============================================
// PAGE 7: WO ACCEPTANCE (OE STEP)
// ============================================

/**
 * Save Page 7 data (all optional for drafts)
 */
export const SavePage7Schema = z.object({
  oeWoAmendmentNeeded: z.boolean().optional(),
  oeSignaturePrepared: z.boolean().optional(),
  courierRequestPrepared: z.boolean().optional(),
});

export type SavePage7Dto = z.infer<typeof SavePage7Schema>;

/**
 * Submit Page 7 (validates required confirmations)
 */
export const SubmitPage7Schema = z
  .object({
    oeWoAmendmentNeeded: z.boolean(),
    oeSignaturePrepared: z.boolean(),
    courierRequestPrepared: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.oeWoAmendmentNeeded) {
      if (data.oeSignaturePrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot prepare signature while amendments are needed",
          path: ["oeSignaturePrepared"],
        });
      }
      if (data.courierRequestPrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot prepare courier request while amendments are needed",
          path: ["courierRequestPrepared"],
        });
      }
    }

    if (!data.oeWoAmendmentNeeded) {
      if (!data.oeSignaturePrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "OE signature must be prepared",
          path: ["oeSignaturePrepared"],
        });
      }
      if (!data.courierRequestPrepared) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Courier request must be prepared",
          path: ["courierRequestPrepared"],
        });
      }
    }
  });

export type SubmitPage7Dto = z.infer<typeof SubmitPage7Schema>;

/**
 * Page 7 response
 */
export const Page7ResponseSchema = z.object({
  oeWoAmendmentNeeded: z.boolean().nullable(),
  oeAmendmentSubmittedAt: z.string().nullable(),
  oeSignaturePrepared: z.boolean(),
  courierRequestPrepared: z.boolean(),
  courierRequestPreparedAt: z.string().nullable(),
  canSubmitForReview: z.boolean(),
  blockers: z.array(z.string()),
});

export type Page7ResponseDto = z.infer<typeof Page7ResponseSchema>;
