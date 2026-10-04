import "server-only";
import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export const householdAccess = cache(async () => {
  if (!authConfigured()) {
    if (process.env.NODE_ENV === "production") throw new AccessError(503, "Household login needs configuration.");
    const live = Boolean(process.env.REDBARK_API_KEY && process.env.ALLOW_LIVE_DATA_WITHOUT_AUTH === "true");
    return { scope: live ? "household" : "preview", actor: "local-development", live };
  }
  const user = await currentUser();
  if (!user) throw new AccessError(401, "Sign in to open your household.");
  const emails = [...new Set((process.env.HOUSEHOLD_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length || emails.length > 2) throw new AccessError(503, "Configure one or two household email addresses.");
  if (!user.emailAddresses.some((email) => email.verification?.status === "verified" && emails.includes(email.emailAddress.toLowerCase()))) {
    throw new AccessError(403, "This account is not a member of this household.");
  }
  return { scope: "household", actor: user.id, live: Boolean(process.env.REDBARK_API_KEY) };
});

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AccessError(403, "This change must come from Harbour.");
  }
}
