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
 * The cookie carries three things, all signed together:
 *
 *   the student's id — opaque, so there is nothing private to encrypt;
 *   when it was issued — checked here, because a cookie's own Max-Age is a
 *     hint to the browser and nothing stops a copied cookie ignoring it;
 *   a stamp derived from the passcode — so resetting a student's passcode
 *     invalidates every session already issued to them, which is the whole
 *     point of a teacher resetting it.
 */

const COOKIE = "mit_sim";
const MAX_AGE_SECONDS = 60 * 60 * 12; // A school day.

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

/**
 * A short stamp standing for "the passcode as it was when this session began".
 * Not the hash itself: there is no reason to put credential material, even
 * hashed, into something the browser holds.
 */
export function passcodeStamp(passcodeHash: string): string {
  return createHash("sha256").update(`stamp:${passcodeHash}`).digest("hex").slice(0, 16);
}

export type SimSession = { studentId: string; stamp: string };

export async function startSession(studentId: string, passcodeHash: string): Promise<void> {
  const issued = Math.floor(Date.now() / 1000);
  const stamp = passcodeStamp(passcodeHash);
  const payload = `${studentId}.${issued}.${stamp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * The session this request carries, if the signature holds and it has not aged
 * out. Says nothing about whether the passcode has since been reset — the
 * caller compares `stamp` against the student's current passcode for that.
 */
export async function readSession(): Promise<SimSession | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [studentId, issuedRaw, stamp, mac] = parts;

  if (!sameString(mac, sign(`${studentId}.${issuedRaw}.${stamp}`))) return null;

  const issued = Number(issuedRaw);
  if (!Number.isFinite(issued)) return null;
  const age = Math.floor(Date.now() / 1000) - issued;
  // A negative age means a clock moved or the value was fabricated; neither is
  // a session worth honouring.
  if (age < 0 || age > MAX_AGE_SECONDS) return null;

  return { studentId, stamp };
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
