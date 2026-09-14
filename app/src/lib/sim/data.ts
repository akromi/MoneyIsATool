import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Instrument, Trade } from "@/lib/sim/engine";
import { buildPortfolio, type Portfolio } from "@/lib/sim/engine";

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

/** The most recent close per instrument — the price a trade placed now will use. */
export async function latestPrices(): Promise<Map<string, { close: number; as_of: string }>> {
  const { data } = await createAdminClient()
    .from("sim_prices")
    .select("instrument_id, close, as_of")
    .order("as_of", { ascending: false });
  const out = new Map<string, { close: number; as_of: string }>();
  for (const row of data || []) {
    if (!out.has(row.instrument_id)) out.set(row.instrument_id, { close: Number(row.close), as_of: row.as_of });
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
