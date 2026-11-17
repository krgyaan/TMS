import "dotenv/config";
import { Pool } from "pg";

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("ERROR: DATABASE_URL is not set in api/.env");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: url,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });

    try {
        console.log("=== 1. OPENWA ENV CONFIG ===");
        console.log({
            OPENWA_BASE_URL: process.env.OPENWA_BASE_URL || "http://localhost:2785 (default)",
            OPENWA_SESSION_ID: process.env.OPENWA_SESSION_ID ? `${process.env.OPENWA_SESSION_ID.slice(0, 8)}...` : "MISSING",
            OPENWA_API_KEY: process.env.OPENWA_API_KEY ? "SET" : "MISSING",
            OPENWA_DRY_RUN: process.env.OPENWA_DRY_RUN ?? "false (default)",
            PO_APPROVER_ACCOUNTS_USER_ID: process.env.PO_APPROVER_ACCOUNTS_USER_ID ?? "(not set - uses Accounts team role lookup)",
        });

        console.log("\n=== 2. LATEST 3 PURCHASE ORDERS ===");
        const pos = await pool.query(`
            SELECT po.id, po.po_number, po.project_id, po.po_raised_by, u.name AS creator_name, u.mobile AS creator_mobile,
                   u.primary_team_id, u.team AS user_team, po.team AS po_team,
                   ep.reporting_tl, tl.name AS reporting_tl_name, tl.mobile AS reporting_tl_mobile,
                   po.tl_status, po.tl_remark, po.po_approved, po.created_at
            FROM purchase_orders po
            LEFT JOIN users u ON u.id = po.po_raised_by
            LEFT JOIN hrms_employee_profiles ep ON ep.user_id = po.po_raised_by
            LEFT JOIN users tl ON tl.id = ep.reporting_tl
            ORDER BY po.id DESC
            LIMIT 3;
        `);
        console.table(pos.rows);

        if (pos.rows.length > 0) {
            const latestPo = pos.rows[0];
            const teamId = latestPo.po_team ?? latestPo.primary_team_id ?? latestPo.user_team;
            console.log(`\n=== 3. TEAM LEADERS FOR CREATOR TEAM (teamId=${teamId}) ===`);
            if (teamId != null) {
                const teamTls = await pool.query(
                    `
                    SELECT u.id, u.name, u.mobile, u.role_id, r.name AS role_name, u.primary_team_id, u.team, u.is_active
                    FROM users u
                    LEFT JOIN roles r ON r.id = u.role_id
                    WHERE u.deleted_at IS NULL
                      AND (u.primary_team_id = $1 OR u.team = $1)
                    ORDER BY u.id ASC;
                    `,
                    [teamId]
                );
                console.table(teamTls.rows);
            } else {
                console.log("Creator has no teamId set on PO or user record.");
            }
        }

        console.log("\n=== 4. LATEST PO APPROVAL WORKFLOWS ===");
        const workflows = await pool.query(`
            SELECT id, purchase_order_id, version, status, current_stage, initiated_by, created_at
            FROM po_approval_workflows
            ORDER BY id DESC
            LIMIT 5;
        `);
        console.table(workflows.rows);

        console.log("\n=== 5. LATEST PO APPROVAL STEPS ===");
        const steps = await pool.query(`
            SELECT id, workflow_id, purchase_order_id, stage_order, stage_role,
                   approver_user_id, approver_name_snapshot, approver_mobile_snapshot,
                   approver_jid, status, skip_reason, wa_message_id, sent_at
            FROM po_approval_steps
            ORDER BY id DESC
            LIMIT 6;
        `);
        console.table(steps.rows);

        console.log("\n=== 6. LATEST PO APPROVAL AUDIT LOGS ===");
        const logs = await pool.query(`
            SELECT id, purchase_order_id, workflow_id, step_id, event_type, actor_user_id, sender_jid, wa_message_id, metadata, created_at
            FROM po_approval_audit_logs
            ORDER BY id DESC
            LIMIT 10;
        `);
        console.table(logs.rows);
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error("Diagnostic failed:", err);
    process.exit(1);
});
