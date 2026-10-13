import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/api/openapi";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(openApiSpec(), { headers: { "cache-control": "public, max-age=3600" } });
}
