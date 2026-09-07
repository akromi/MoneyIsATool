"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type RequestState = { ok?: boolean; error?: string };

export async function submitLicenceRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const school_name = String(formData.get("school") || "").trim();
  const contact_name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const seatsRaw = String(formData.get("seats") || "").trim();
  const message = String(formData.get("message") || "").trim().slice(0, 2000);
  if (String(formData.get("website") || "")) return { ok: true }; // honeypot
  if (!school_name || !contact_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please fill in the school, your name and a valid email." };
  const seats = seatsRaw ? Math.max(1, Math.min(500, parseInt(seatsRaw, 10) || 0)) || null : null;

  const admin = createAdminClient();
  const { error } = await admin.from("licence_requests").insert({ school_name, contact_name, email, seats, message });
  if (error) return { error: "Sorry, the request could not be saved. Please email us instead." };
  return { ok: true };
}
