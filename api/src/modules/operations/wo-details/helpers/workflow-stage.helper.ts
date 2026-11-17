import type { DbInstance } from '@db';
import { sql } from 'drizzle-orm';

export async function recomputeWorkflowStage(
    db: DbInstance,
    woDetailId: number,
): Promise<void> {
    await db.execute(sql`
        UPDATE wo_basic_details b
        SET current_stage = CASE
                WHEN d.status IS DISTINCT FROM 'wo_details_filled' THEN 'wo_details'
                WHEN a.decision IS DISTINCT FROM 'accepted'
                     AND a.status IS DISTINCT FROM 'completed' THEN 'wo_acceptance'
                WHEN NOT EXISTS (
                    SELECT 1
                    FROM wo_kickoff_meetings k
                    WHERE k.wo_detail_id = d.id
                      AND k.mom_file_path IS NOT NULL
                ) THEN 'kick_off'
                WHEN d.is_contract_agreement = true
                     AND (d.ve_signed IS NULL OR d.client_and_ve_signed IS NULL) THEN 'contract_agreement'
                WHEN COALESCE(a.is_completed, false) = false
                     AND a.status IS DISTINCT FROM 'completed' THEN 'wo_upload'
                ELSE 'completed'
            END,
            updated_at = now()
        FROM wo_details d
        LEFT JOIN wo_acceptance a ON a.wo_detail_id = d.id
        WHERE d.id = ${woDetailId}
          AND b.id = d.wo_basic_detail_id
    `);
}
