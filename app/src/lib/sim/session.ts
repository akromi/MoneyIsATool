import "server-only";
import { createHmac, randomBytes, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Students have no email address and no auth account, deliberately: holding no
 * direct identifier is what keeps this simple under Canadian school privacy
 * law. So they cannot use Supabase auth, and get a signed session cookie
 * instead, issued after they present the class code, their name and the
 * passcode their teacher handed out.
 *
 * The cookie carries the student's id and nothing else. It is signed, not
 * encrypted — there is nothing private in an opaque id, and the signature is
 * what stops one student claiming to be another.
 */

const COOKIE = "mit_sim";
const MAX_AGE = 60 * 60 * 12; // A school day, not a month.

/** No new environment variable to configure: the service key never leaves the server. */
function secret(): string {
  return process.env.SIM_SESSION_SECRET || env("SUPABASE_SERVICE_ROLE_KEY");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function startSession(studentId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, `${studentId}.${sign(studentId)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** The signed-in student's id, or null. Never trust the id without the signature. */
export async function currentStudentId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const cut = raw.lastIndexOf(".");
  if (cut < 1) return null;
  const id = raw.slice(0, cut);
  const mac = raw.slice(cut + 1);
  return sameString(mac, sign(id)) ? id : null;
}

/* ---------- passcodes ---------- */

/** Short, readable, and free of characters that are misread aloud in a classroom. */
export function newPasscode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export function newJoinCode(): string {
  return newPasscode();
}

export function hashPasscode(passcode: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${passcode.trim().toUpperCase()}`).digest("hex");
}

export function newSalt(): string {
  return randomBytes(12).toString("hex");
}

export function passcodeMatches(passcode: string, salt: string, hash: string): boolean {
  return sameString(hashPasscode(passcode, salt), hash);
}
