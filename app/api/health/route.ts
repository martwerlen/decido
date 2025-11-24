import { NextResponse } from "next/server"

/**
 * Health check endpoint for Railway
 * Simple check that returns 200 OK if the app is running
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString()
  })
}
