import { NextResponse } from "next/server";

import { pingDatabase } from "@syntheci/db";

export async function GET() {
  try {
    await pingDatabase();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "health check failed"
      },
      {
        status: 500
      }
    );
  }
}
