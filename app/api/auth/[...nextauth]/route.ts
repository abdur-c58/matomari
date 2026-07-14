import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  _ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return handlers.GET(req);
}

export async function POST(
  req: NextRequest,
  _ctx: { params: Promise<{ nextauth: string[] }> }
) {
  return handlers.POST(req);
}
