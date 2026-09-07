import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ownerEmails } from "@/lib/env";

export type SessionUser = { id: string; email: string; fullName: string };

export async function getUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u || !u.email) return null;
  return {
    id: u.id,
    email: u.email.toLowerCase(),
    fullName: (u.user_metadata?.full_name as string | undefined) || "",
  };
}

/** Redirects to /login (remembering where to return) when signed out. */
export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function isOwner(user: SessionUser | null): boolean {
  return !!user && ownerEmails().includes(user.email);
}

export async function requireOwner(next: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!isOwner(user)) redirect("/account?denied=1");
  return user;
}
