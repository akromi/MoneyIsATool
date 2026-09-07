/** Small env helper: read at call time (never at import), so `next build`
 *  succeeds without secrets and misconfiguration surfaces as a clear error. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function calculatorsUrl(): string {
  return (process.env.NEXT_PUBLIC_CALCULATORS_URL || "https://moneyisatool.ca").replace(/\/$/, "");
}

export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
