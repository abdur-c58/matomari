import { createAdminClient } from "@/lib/supabase/admin";

export type SupportCategory = "general" | "billing" | "bug" | "account" | "other";
export type SupportStatus = "open" | "resolved";

export type SupportMessageRow = {
  id: string;
  userId: string | null;
  senderName: string | null;
  senderEmail: string;
  category: SupportCategory;
  subject: string;
  body: string;
  status: SupportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

function mapRow(row: {
  id: string;
  user_id: string | null;
  sender_name: string | null;
  sender_email: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}): SupportMessageRow {
  return {
    id: row.id,
    userId: row.user_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    category: row.category as SupportCategory,
    subject: row.subject,
    body: row.body,
    status: row.status as SupportStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export async function createSupportMessage(params: {
  userId?: string | null;
  senderName?: string | null;
  senderEmail: string;
  category: SupportCategory;
  subject: string;
  body: string;
}): Promise<SupportMessageRow> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Support is temporarily unavailable");
  }

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: params.userId ?? null,
      sender_name: params.senderName?.trim() || null,
      sender_email: params.senderEmail.trim().toLowerCase(),
      category: params.category,
      subject: params.subject.trim(),
      body: params.body.trim(),
    })
    .select(
      "id, user_id, sender_name, sender_email, category, subject, body, status, created_at, resolved_at, resolved_by"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not send message");
  }

  return mapRow(data);
}

export async function listSupportMessages(params?: {
  status?: SupportStatus | "all";
  limit?: number;
}): Promise<SupportMessageRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  let query = supabase
    .from("support_messages")
    .select(
      "id, user_id, sender_name, sender_email, category, subject, body, status, created_at, resolved_at, resolved_by"
    )
    .order("created_at", { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.warn("listSupportMessages failed:", error?.message);
    return [];
  }

  return data.map(mapRow);
}

export async function countOpenSupportMessages(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (error) return 0;
  return count ?? 0;
}

export async function resolveSupportMessage(params: {
  messageId: string;
  resolvedBy: string;
}): Promise<SupportMessageRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: params.resolvedBy,
    })
    .eq("id", params.messageId)
    .select(
      "id, user_id, sender_name, sender_email, category, subject, body, status, created_at, resolved_at, resolved_by"
    )
    .maybeSingle();

  if (error || !data) {
    console.warn("resolveSupportMessage failed:", error?.message);
    return null;
  }

  return mapRow(data);
}

export async function reopenSupportMessage(
  messageId: string
): Promise<SupportMessageRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .update({
      status: "open",
      resolved_at: null,
      resolved_by: null,
    })
    .eq("id", messageId)
    .select(
      "id, user_id, sender_name, sender_email, category, subject, body, status, created_at, resolved_at, resolved_by"
    )
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}
