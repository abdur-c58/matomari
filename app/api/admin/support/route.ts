import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/require-staff";
import {
  listSupportMessages,
  reopenSupportMessage,
  resolveSupportMessage,
  type SupportStatus,
} from "@/lib/services/support-service";

export async function GET(request: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "open") as SupportStatus | "all";
  const messages = await listSupportMessages({ status, limit: 200 });

  return NextResponse.json({ messages });
}

const patchSchema = z.object({
  messageId: z.string().uuid(),
  status: z.enum(["open", "resolved"]),
});

export async function PATCH(request: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }

  try {
    const json = await request.json();
    const { messageId, status } = patchSchema.parse(json);

    const message =
      status === "resolved"
        ? await resolveSupportMessage({
            messageId,
            resolvedBy: staff.userId,
          })
        : await reopenSupportMessage(messageId);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
