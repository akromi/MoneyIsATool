import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Instrument, Trade } from "@/lib/sim/engine";
import { buildPortfolio, type Portfolio } from "@/lib/sim/engine";
import { passcodeStamp, readSession } from "@/lib/sim/session";

/**
 * Every read here is scoped explicitly by class or student. Row Level Security
 * is on with no permissive policy, so these tables are unreachable through the
 * public API; the scoping below is what keeps one class out of another's data.
 */

export type SimClass = {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  starting_cash: number;
  leaderboard_mode: "hidden" | "top" | "full";
  trading_open: boolean;
  created_at: string;
};

export type SimStudent = {
  id: string;
  class_id: string;
  display_name: string;
  account_type: string | null;
  goal: string | null;
  created_at: string;
};

export async function listInstruments(): Promise<Instrument[]> {
  const { data } = await createAdminClient()
    .from("sim_instruments")
    .select("id, symbol, name, kind, what_it_is, how_you_earn, key_risks, income_type, fits")
    .order("sort_order");
  return (data || []) as Instrument[];
}

/**
 * The most recent close per instrument — the price a trade placed now will use.
 *
 * The source travels with it, because the trade has to record whether the
 * number it paid was a real close somebody typed in or one of the generated
 * ones, and sim_trades cannot be corrected afterwards.
 */
export async function latestPrices(): Promise<Map<string, { close: number; as_of: string; source: string }>> {
  const { data } = await createAdminClient()
    .from("sim_prices")
    .select("instrument_id, close, as_of, source")
    .order("as_of", { ascending: false });
  const out = new Map<string, { close: number; as_of: string; source: string }>();
  for (const row of data || []) {
    if (!out.has(row.instrument_id)) {
      out.set(row.instrument_id, { close: Number(row.close), as_of: row.as_of, source: row.source || "seeded" });
    }
  }
  return out;
}

export async function tradesFor(studentId: string): Promise<Trade[]> {
  const { data } = await createAdminClient()
    .from("sim_trades")
    .select("id, instrument_id, side, quantity, price_used, price_as_of, reason_code, reason_text, recorded_at")
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: false });
  return (data || []).map((t) => ({ ...t, quantity: Number(t.quantity), price_used: Number(t.price_used) })) as Trade[];
}

export async function portfolioFor(studentId: string, startingCash: number): Promise<Portfolio> {
  const [trades, instruments, latest] = await Promise.all([
    tradesFor(studentId),
    listInstruments(),
    latestPrices(),
  ]);
  return buildPortfolio(startingCash, trades, instruments, latest);
}

export async function classById(id: string): Promise<SimClass | null> {
  const { data } = await createAdminClient().from("sim_classes").select("*").eq("id", id).maybeSingle();
  return data ? ({ ...data, starting_cash: Number(data.starting_cash) } as SimClass) : null;
}

export async function classByJoinCode(code: string): Promise<SimClass | null> {
  const { data } = await createAdminClient()
    .from("sim_classes")
    .select("*")
    .eq("join_code", code.trim().toUpperCase())
    .maybeSingle();
  return data ? ({ ...data, starting_cash: Number(data.starting_cash) } as SimClass) : null;
}

/**
 * The signed-in student, or null. Checks the session's passcode stamp against
 * the stored passcode: a teacher resetting a passcode has to end the sessions
 * it opened, or resetting it would not actually shut anybody out.
 */
export async function currentStudent(): Promise<SimStudent | null> {
  const session = await readSession();
  if (!session) return null;
  const { data } = await createAdminClient()
    .from("sim_students")
    .select("id, class_id, display_name, account_type, goal, created_at, passcode_hash")
    .eq("id", session.studentId)
    .maybeSingle();
  if (!data) return null;
  if (passcodeStamp(data.passcode_hash) !== session.stamp) return null;
  const { passcode_hash: _ignored, ...student } = data;
  return student as SimStudent;
}

/**
 * Matched on the lowercased name, not with `ilike`: a name is a literal, and
 * PostgREST would have read `%` and `_` in it as LIKE wildcards.
 */
export async function studentByName(classId: string, name: string) {
  const { data } = await createAdminClient()
    .from("sim_students")
    .select("id, display_name, passcode_salt, passcode_hash")
    .eq("class_id", classId)
    .eq("display_name", name.trim())
    .maybeSingle();
  if (data) return data;
  // The roster is unique case-insensitively, so at most one row can match.
  const { data: rows } = await createAdminClient()
    .from("sim_students")
    .select("id, display_name, passcode_salt, passcode_hash")
    .eq("class_id", classId);
  const wanted = name.trim().toLowerCase();
  return (rows || []).find((r) => r.display_name.toLowerCase() === wanted) || null;
}

export async function studentById(id: string): Promise<SimStudent | null> {
  const { data } = await createAdminClient()
    .from("sim_students")
    .select("id, class_id, display_name, account_type, goal, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as SimStudent) || null;
}

export async function studentsIn(classId: string): Promise<SimStudent[]> {
  const { data } = await createAdminClient()
    .from("sim_students")
    .select("id, class_id, display_name, account_type, goal, created_at")
    .eq("class_id", classId)
    .order("display_name");
  return (data || []) as SimStudent[];
}

export type Standing = { rank: number; name: string; value: number; isMe: boolean };

/**
 * The class standings a student is allowed to see, decided here rather than in
 * the page. A ranking the server sends is a ranking the student can read out of
 * their own browser, so "hidden" has to mean "never fetched".
 */
export async function standingsFor(
  klass: SimClass,
  meId: string,
): Promise<Standing[] | null> {
  if (klass.leaderboard_mode === "hidden") return null;

  const students = await studentsIn(klass.id);
  const scored = await Promise.all(
    students.map(async (s) => ({
      name: s.display_name,
      value: (await portfolioFor(s.id, klass.starting_cash)).value,
      isMe: s.id === meId,
    })),
  );
  scored.sort((a, b) => b.value - a.value);
  const ranked = scored.map((r, i) => ({ ...r, rank: i + 1 }));

  if (klass.leaderboard_mode === "full") return ranked;
  // "top" shows the leading few, plus the student's own line so they can see
  // where they stand without the whole class being on display.
  const top = ranked.slice(0, 3);
  const mine = ranked.find((r) => r.isMe);
  return mine && !top.some((r) => r.isMe) ? [...top, mine] : top;
}

export type StoredPrice = {
  instrument_id: string;
  close: number;
  as_of: string;
  source: string;
  entered_at: string | null;
};

/**
 * The newest stored close per instrument, with where it came from.
 *
 * `latestPrices` deliberately returns only what a trade needs. This is for the
 * teacher's own page, which has to show whether a number is today's real close
 * somebody typed in, or a leftover from the generated series.
 */
export async function latestStoredPrices(): Promise<Map<string, StoredPrice>> {
  const { data } = await createAdminClient()
    .from("sim_prices")
    .select("instrument_id, close, as_of, source, entered_at")
    .order("as_of", { ascending: false });
  const out = new Map<string, StoredPrice>();
  for (const row of data || []) {
    if (!out.has(row.instrument_id)) out.set(row.instrument_id, { ...row, close: Number(row.close) } as StoredPrice);
  }
  return out;
}

/** Today where the students are, not where the server is. */
export function todayInToronto(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Monday is 1, Sunday is 7, for a plain YYYY-MM-DD with no timezone in it. */
function isoWeekday(day: string): number {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function isTradingDay(day: string): boolean {
  return isoWeekday(day) < 6;
}

/**
 * The most recent day the market was open, counting back from today in Toronto.
 *
 * Saturday and Sunday have no close, so treating the calendar day as the
 * trading day made Friday's perfectly good prices read as stale all weekend,
 * and offered the teacher a Saturday to file them under.
 *
 * Weekends only. Statutory holidays are not in here — there is no exchange
 * calendar to consult without a data feed, which is the thing this design
 * exists to avoid. The cost of that is a holiday looking like a day somebody
 * forgot, which the page states as a date rather than an accusation.
 */
export function lastTradingDay(now = new Date()): string {
  const day = todayInToronto(now);
  const d = new Date(`${day}T12:00:00Z`);
  while (isoWeekday(d.toISOString().slice(0, 10)) > 5) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type PriceFreshness = {
  /** The oldest close in use — what the page must report, because a portfolio is only as current as its stalest holding. */
  oldest: string | null;
  newest: string | null;
  /** An instrument with no price at all. Students cannot trade it. */
  missing: boolean;
  /** The instruments are not all priced to the same day. */
  mixed: boolean;
  stale: boolean;
};

/**
 * How current the prices are, judged across every instrument rather than by the
 * newest one.
 *
 * Entering one instrument's close and leaving the rest made the newest date
 * today, and a page reading that reported the whole portfolio as valued today
 * while most of it sat on last week's numbers. The oldest is the honest figure.
 */
export function priceFreshness(
  prices: Map<string, StoredPrice>,
  instrumentIds: string[],
  marketDay: string = lastTradingDay(),
): PriceFreshness {
  const dates = instrumentIds.map((id) => prices.get(id)?.as_of ?? null);
  const known = dates.filter((d): d is string => !!d).sort();
  const oldest = known[0] ?? null;
  const newest = known[known.length - 1] ?? null;
  return {
    oldest,
    newest,
    missing: dates.some((d) => d === null),
    mixed: !!oldest && oldest !== newest,
    stale: dates.some((d) => d === null) || !oldest || oldest < marketDay,
  };
}
