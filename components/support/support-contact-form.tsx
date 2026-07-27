"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing & subscription" },
  { value: "bug", label: "Bug or technical issue" },
  { value: "account", label: "Account help" },
  { value: "other", label: "Other" },
] as const;

export function SupportContactForm() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValue = signedIn ? session?.user?.email ?? senderEmail : senderEmail;
  const nameValue = signedIn
    ? session?.user?.name ?? senderName
    : senderName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValue?.trim()) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: nameValue?.trim() || undefined,
          senderEmail: emailValue.trim(),
          category,
          subject,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not send message");
      }
      setSent(true);
      setSubject("");
      setBody("");
      if (!signedIn) {
        setSenderName("");
        setSenderEmail("");
      }
      toast.success("Message sent — we'll get back to you soon");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-surface/60 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Message received</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Thanks for reaching out. We read every message and will reply to{" "}
          <span className="text-foreground">{emailValue}</span> when we can.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => setSent(false)}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-5 rounded-2xl border border-border bg-surface/60 p-6 sm:p-8"
    >
      {!signedIn ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="support-name">Name</Label>
            <Input
              id="support-name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          Signed in as{" "}
          <span className="text-foreground">
            {session?.user?.name ?? session?.user?.email}
          </span>
          . Replies will go to {session?.user?.email}.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="support-category">Topic</Label>
        <select
          id="support-category"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as (typeof CATEGORIES)[number]["value"])
          }
          className="flex h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary"
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-body">Message</Label>
        <Textarea
          id="support-body"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us what you need help with…"
          rows={6}
          maxLength={5000}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {!signedIn ? (
            <>
              Have an account?{" "}
              <Link href="/today" className="text-foreground underline underline-offset-2">
                Sign in
              </Link>{" "}
              so we can link this to your profile.
            </>
          ) : (
            "We typically reply within a few business days."
          )}
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
