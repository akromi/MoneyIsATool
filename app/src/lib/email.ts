import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, siteUrl } from "@/lib/env";

/** Emails a single-use sign-in link (creating the account if needed).
 *  Uses a fresh anonymous client so it never touches the caller's session. */
export async function sendSignInLink(email: string, next = "/account"): Promise<{ error?: string }> {
  const pub = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await pub.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  return error ? { error: error.message } : {};
}
