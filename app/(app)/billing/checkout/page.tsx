import { redirect } from "next/navigation";

/** Legacy in-app checkout URLs → Paddle.js pricing page. */
export default async function BillingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.plan === "plus" || sp.plan === "pro") {
    params.set("plan", sp.plan);
  }
  if (sp.interval === "monthly" || sp.interval === "annual") {
    params.set("interval", sp.interval);
  }
  const qs = params.toString();
  redirect(qs ? `/pricing?${qs}` : "/pricing");
}
