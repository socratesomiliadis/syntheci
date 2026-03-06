import { sql } from "drizzle-orm";

import { db } from "./client";

export async function pingDatabase() {
  const result = await db.execute(sql`select 1 as ok`);
  return result.rows[0];
}
