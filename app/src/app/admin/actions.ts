"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { newInviteCode } from "@/lib/entitlements";
import { sendSignInLink } from "@/lib/email";

export type AdminState = { ok?: string; error?: string };

export async function createLicence(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireOwner("/admin");
  const school_name = String(formData.get("school") || "").trim();
  const admin_email = String(formData.get("admin_email") || "").trim().toLowerCase();
  const seats = parseInt(String(formData.get("seats") || "0"), 10);
  const expires = String(formData.get("expires") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!school_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email) || !(seats > 0)) return { error: "School, a valid administrator email and a seat count are required." };

  const admin = createAdminClient();
  const { error } = await admin.from("licences").insert({
    school_name, admin_email, seats, notes,
    expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    invite_code: newInviteCode(),
  });
  if (error) return { error: error.message };

  // Email the administrator a sign-in link (creates their account if needed).
  if (formData.get("send_link")) await sendSignInLink(admin_email, "/account");
  revalidatePath("/admin");
  return { ok: `Licence created for ${school_name}.` };
}

export async function setLicenceStatus(formData: FormData) {
  await requireOwner("/admin");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") === "suspended" ? "suspended" : "active";
  await createAdminClient().from("licences").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function updateSeats(formData: FormData) {
  await requireOwner("/admin");
  const id = String(formData.get("id") || "");
  const seats = parseInt(String(formData.get("seats") || "0"), 10);
  if (seats > 0) await createAdminClient().from("licences").update({ seats }).eq("id", id);
  revalidatePath("/admin");
}

export async function markRequestHandled(formData: FormData) {
  await requireOwner("/admin");
  const id = String(formData.get("id") || "");
  await createAdminClient().from("licence_requests").update({ handled: true }).eq("id", id);
  revalidatePath("/admin");
}

export async function upsertResource(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireOwner("/admin");
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const audience = String(formData.get("audience") || "") === "teacher" ? "teacher" : "book";
  const storage_path = String(formData.get("storage_path") || "").trim().replace(/^\/+/, "");
  const file_name = String(formData.get("file_name") || "").trim() || storage_path.split("/").pop() || "";
  const sort_order = parseInt(String(formData.get("sort_order") || "100"), 10) || 100;
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !title || !storage_path) return { error: "Slug (letters, digits, dashes), title and storage path are required." };

  const admin = createAdminClient();
  const { data: exists, error: probe } = await admin.storage.from("resources").createSignedUrl(storage_path, 30);
  if (probe || !exists) return { error: `No file at "${storage_path}" in the resources bucket. Upload it first, then add it here.` };

  const { error } = await admin.from("resources").upsert({ slug, title, description, audience, storage_path, file_name, sort_order }, { onConflict: "slug" });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: `Saved "${title}".` };
}

export async function deleteResource(formData: FormData) {
  await requireOwner("/admin");
  const id = String(formData.get("id") || "");
  await createAdminClient().from("resources").delete().eq("id", id);
  revalidatePath("/admin");
}
