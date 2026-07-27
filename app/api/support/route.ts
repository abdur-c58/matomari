import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createSupportMessage } from "@/lib/services/support-service";

const bodySchema = z.object({
  senderName: z.string().trim().max(120).optional(),
  senderEmail: z.string().trim().email().max(320),
  category: z.enum(["general", "billing", "bug", "account", "other"]).default("general"),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const session = await auth();
    const userId = session?.user?.supabaseUserId ?? null;
    const sessionEmail = session?.user?.email?.trim().toLowerCase();

    if (userId && sessionEmail && parsed.senderEmail.toLowerCase() !== sessionEmail) {
      return NextResponse.json(
        { error: "Use the email on your signed-in account" },
        { status: 400 }
      );
    }

    const message = await createSupportMessage({
      userId,
      senderName: parsed.senderName ?? session?.user?.name ?? null,
      senderEmail: parsed.senderEmail,
      category: parsed.category,
      subject: parsed.subject,
      body: parsed.body,
    });

    return NextResponse.json({ ok: true, id: message.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid message" },
        { status: 400 }
      );
    }
    console.warn("support POST failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send message" },
      { status: 500 }
    );
  }
}
