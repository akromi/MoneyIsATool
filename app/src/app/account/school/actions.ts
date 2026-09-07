"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { newInviteCode } from "@/lib/entitlements";

async function assertAdmin(licenceId: string) {
  const user = await requireUser("/account");
  const admin = createAdminClient();
  const { data } = await admin
    .from("licence_members").select("role").eq("licence_id", licenceId).eq("user_id", user.id).maybeSingle();
  if (data?.role !== "admin") throw new Error("Not a licence administrator");
  return { user, admin };
}

export async function removeTeacher(formData: FormData) {
  const licenceId = String(formData.get("licence") || "");
  const userId = String(formData.get("user") || "");
  const { user, admin } = await assertAdmin(licenceId);
  if (userId === user.id) return;
  await admin.from("licence_members").delete().eq("licence_id", licenceId).eq("user_id", userId).eq("role", "teacher");
  revalidatePath("/account/school");
}

export async function regenerateInvite(formData: FormData) {
  const licenceId = String(formData.get("licence") || "");
  const { admin } = await assertAdmin(licenceId);
  await admin.from("licences").update({ invite_code: newInviteCode() }).eq("id", licenceId);
  revalidatePath("/account/school");
}
