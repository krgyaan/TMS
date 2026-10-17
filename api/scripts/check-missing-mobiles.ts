#!/usr/bin/env tsx
import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";

const DATABASE_URL = process.env.DATABASE_URL;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {
    team: "1,2",
    allocated: false,
    all: false,
    csv: undefined,
    strict: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--team" && args[i + 1]) {
      parsed.team = args[i + 1];
      i++;
    } else if (a === "--allocated") {
      parsed.allocated = true;
    } else if (a === "--all") {
      parsed.all = true;
    } else if (a === "--csv" && args[i + 1]) {
      parsed.csv = args[i + 1];
      i++;
    } else if (a === "--strict") {
      parsed.strict = true;
    }
  }
  return parsed;
}

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set in environment");
    process.exit(1);
  }

  const opts = parseArgs();
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const teamFilter = !opts.all
      ? `AND COALESCE(u.primary_team_id, u.team) IN (${opts.team
          .split(",")
          .map((x: string) => Number(x.trim()) || 0)
          .filter((n: number) => n > 0)
          .join(",") || "1,2"})`
      : "";

    const allocatedFilter = opts.allocated
      ? `OR u.id IN (SELECT team_member FROM tender_infos WHERE team_member IS NOT NULL)`
      : "";

    const scopeFilter = opts.all
      ? ""
      : `AND (${teamFilter.replace("AND ", "")}${allocatedFilter ? allocatedFilter : ""})`;

    const q = `
SELECT DISTINCT
  u.id,
  u.name,
  u.email,
  COALESCE(u.primary_team_id, u.team) AS effective_team,
  r.name AS role,
  CASE WHEN u.mobile IS NULL OR btrim(u.mobile) = '' THEN true ELSE false END AS missing_mobile,
  u.mobile AS mobile
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL AND u.is_active
  ${opts.all ? "" : scopeFilter}
ORDER BY missing_mobile DESC, effective_team, u.id
`;

    const res = await pool.query(q);
    const rows = res.rows;

    console.log(
      `id,name,email,effective_team,role,missing_mobile,mobile`
    );
    const outLines: string[] = [
      `id,name,email,effective_team,role,missing_mobile,mobile`,
    ];
    rows.forEach((r: any) => {
      const line = [
        r.id,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.email || "").replace(/"/g, '""')}"`,
        r.effective_team || "",
        `"${(r.role || "").replace(/"/g, '""')}"`,
        r.missing_mobile,
        `"${(r.mobile || "").replace(/"/g, '""')}"`,
      ].join(",");
      console.log(line);
      outLines.push(line);
    });

    if (opts.csv) {
      fs.writeFileSync(opts.csv, outLines.join("\n") + "\n");
      console.log(`\nWrote CSV to ${opts.csv}`);
    }

    const missing = rows.filter((r: any) => r.missing_mobile).length;
    console.log(
      `\nTotal active users in scope: ${rows.length}; Missing mobile: ${missing}`
    );

    if (opts.strict && missing > 0) {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
