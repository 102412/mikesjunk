import { NextResponse } from "next/server";
import { getIntegrationRuntimeStatus } from "@/lib/integration-runtime";

export const dynamic = "force-dynamic";

/** Public, deliberately non-sensitive capability status for the Connections UI. */
export async function GET() {
  return NextResponse.json(getIntegrationRuntimeStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
