import { createAdminClient } from "@/lib/supabase/admin";

/** Resolve Matomari user_id from Paddle customer or subscription IDs. */
export async function resolveUserIdForPaddleIds(params: {
  customerId?: string | null;
  subscriptionId?: string | null;
  customData?: Record<string, unknown> | null;
}): Promise<string | null> {
  const fromCustom = params.customData?.userId;
  if (typeof fromCustom === "string" && fromCustom.trim()) {
    return fromCustom.trim();
  }

  const supabase = createAdminClient();
  if (!supabase) return null;

  if (params.subscriptionId) {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("paddle_subscription_id", params.subscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  if (params.customerId) {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("paddle_customer_id", params.customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  return null;
}
