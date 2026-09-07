import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionUser } from "@/lib/auth";

export type Licence = {
  id: string;
  school_name: string;
  admin_email: string;
  seats: number;
  invite_code: string;
  status: "active" | "suspended";
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Membership = { licence: Licence; role: "admin" | "teacher"; joined_at: string };

export type Entitlements = {
  /** Digital book + Financial Decision Tools (individual purchase or active school licence) */
  book: boolean;
  /** Teacher Resources (active school licence only) */
  teacher: boolean;
  purchases: { id: string; created_at: string; product: string }[];
  memberships: Membership[];
};

export function licenceIsActive(l: Licence, now = new Date()): boolean {
  if (l.status !== "active") return false;
  if (l.expires_at && new Date(l.expires_at) < now) return false;
  return true;
}

/** Makes a licence's designated admin a member the first time they sign in. */
async function claimPendingAdminMemberships(user: SessionUser) {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("licences")
    .select("id")
    .ilike("admin_email", user.email);
  if (!pending?.length) return;
  const { data: existing } = await admin
    .from("licence_members")
    .select("licence_id")
    .eq("user_id", user.id);
  const have = new Set((existing || []).map((m) => m.licence_id));
  const rows = pending.filter((l) => !have.has(l.id)).map((l) => ({ licence_id: l.id, user_id: user.id, role: "admin" }));
  if (rows.length) await admin.from("licence_members").upsert(rows, { onConflict: "licence_id,user_id" });
}

export async function getEntitlements(user: SessionUser): Promise<Entitlements> {
  await claimPendingAdminMemberships(user);
  const admin = createAdminClient();

  const [{ data: byUser }, { data: byEmail }, { data: members }] = await Promise.all([
    admin.from("purchases").select("id, created_at, product, user_id").eq("user_id", user.id),
    admin.from("purchases").select("id, created_at, product, user_id").ilike("email", user.email),
    admin
      .from("licence_members")
      .select("role, joined_at, licence:licences(*)")
      .eq("user_id", user.id),
  ]);
  const seen = new Set<string>();
  const purchases = [...(byUser || []), ...(byEmail || [])].filter((p) => !seen.has(p.id) && seen.add(p.id));

  // Attach purchases made before the account existed.
  const unlinked = purchases.filter((p) => !p.user_id);
  if (unlinked.length) {
    await admin.from("purchases").update({ user_id: user.id }).in("id", unlinked.map((p) => p.id));
  }

  const memberships: Membership[] = (members || [])
    .map((m) => ({ licence: m.licence as unknown as Licence, role: m.role as "admin" | "teacher", joined_at: m.joined_at }))
    .filter((m) => !!m.licence);
  const activeSchool = memberships.some((m) => licenceIsActive(m.licence));

  return {
    book: purchases.length > 0 || activeSchool,
    teacher: activeSchool,
    purchases: purchases.map((p) => ({ id: p.id, created_at: p.created_at, product: p.product })),
    memberships,
  };
}

export function canAccess(e: Entitlements, audience: "book" | "teacher"): boolean {
  return audience === "book" ? e.book : e.teacher;
}

/** Seats in use = teachers (the licence admin does not consume a seat). */
export async function seatUsage(licenceId: string): Promise<{ used: number }> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("licence_members")
    .select("user_id", { count: "exact", head: true })
    .eq("licence_id", licenceId)
    .eq("role", "teacher");
  return { used: count || 0 };
}

export function newInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
