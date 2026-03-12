import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getMonthGridBounds, parseMonthKey } from "@/lib/calendar";
import { getMeetingCalendarFeed } from "@/lib/meetings";
import { requireWorkspaceContext } from "@/lib/session";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

export async function GET(request: NextRequest) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const query = querySchema.safeParse({
    month: request.nextUrl.searchParams.get("month")
  });

  if (!query.success) {
    return NextResponse.json({ error: "invalid month" }, { status: 400 });
  }

  const monthDate = parseMonthKey(query.data.month);
  const { start, end } = getMonthGridBounds(monthDate);
  const feed = await getMeetingCalendarFeed({
    workspaceId,
    userId: session.user.id,
    rangeStart: start,
    rangeEnd: end
  });

  return NextResponse.json(feed);
}
