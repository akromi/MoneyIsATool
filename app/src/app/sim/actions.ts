"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { classByJoinCode, classById, latestPrices, portfolioFor, studentById } from "@/lib/sim/data";
import { REASONS, SELL_REASONS } from "@/lib/sim/engine";
import { currentStudentId, endSession, passcodeMatches, startSession } from "@/lib/sim/session";

export type SimState = { error?: string; ok?: string };

/** Class code + name + passcode. No email is asked for, or stored. */
export async function joinClass(_prev: SimState, form: FormData): Promise<SimState> {
  const code = String(form.get("code") || "").trim().toUpperCase();
  const name = String(form.get("name") || "").trim();
  const passcode = String(form.get("passcode") || "").trim();
  if (!code || !name || !passcode) return { error: "Class code, your name and your passcode are all needed." };

  const klass = await classByJoinCode(code);
  if (!klass) return { error: "That class code was not recognised. Check it with your teacher." };

  const { data: student } = await createAdminClient()
    .from("sim_students")
    .select("id, display_name, passcode_salt, passcode_hash")
    .eq("class_id", klass.id)
    .ilike("display_name", name)
    .maybeSingle();

  // One message for both failures: saying which half was wrong tells an
  // outsider whether a name is on the roster.
  if (!student || !passcodeMatches(passcode, student.passcode_salt, student.passcode_hash)) {
    return { error: "That name and passcode do not match this class." };
  }

  await startSession(student.id);
  redirect("/sim");
}

export async function leaveSim(): Promise<void> {
  await endSession();
  redirect("/sim/join");
}

/**
 * Writes one row to the ledger, storing the price as used and why the student
 * says they traded. Nothing is ever updated: a correction is another trade.
 */
export async function placeTrade(_prev: SimState, form: FormData): Promise<SimState> {
  const studentId = await currentStudentId();
  if (!studentId) return { error: "Your session has ended. Sign in again to keep trading." };

  const student = await studentById(studentId);
  if (!student) return { error: "Your session has ended. Sign in again to keep trading." };
  const klass = await classById(student.class_id);
  if (!klass) return { error: "This class is no longer available." };
  if (!klass.trading_open) return { error: "Your teacher has paused trading for this class." };

  const instrumentId = String(form.get("instrument") || "");
  const side = String(form.get("side") || "") === "sell" ? "sell" : "buy";
  const quantity = Number(String(form.get("quantity") || "").replace(/[,\s]/g, ""));
  const reasonCode = String(form.get("reason") || "");
  const reasonText = String(form.get("reason_text") || "").trim() || null;

  if (!instrumentId) return { error: "Choose an investment." };
  if (!isFinite(quantity) || quantity <= 0) return { error: "Enter how many units you want to trade." };
  const allowed = side === "buy" ? REASONS : SELL_REASONS;
  if (!allowed[reasonCode]) return { error: "Choose a reason. It is recorded with the trade." };

  const prices = await latestPrices();
  const price = prices.get(instrumentId);
  if (!price) return { error: "There is no price for that investment yet." };

  const portfolio = await portfolioFor(studentId, klass.starting_cash);
  const cost = quantity * price.close;

  if (side === "buy" && cost > portfolio.cash + 1e-9) {
    return { error: `That costs more than your cash. You have ${portfolio.cash.toFixed(2)} left.` };
  }
  if (side === "sell") {
    const held = portfolio.holdings.find((h) => h.instrument.id === instrumentId);
    if (!held || held.quantity + 1e-9 < quantity) {
      return { error: `You only hold ${held ? held.quantity : 0} of that.` };
    }
  }

  const { error } = await createAdminClient().from("sim_trades").insert({
    student_id: studentId,
    instrument_id: instrumentId,
    side,
    quantity,
    price_used: price.close,
    price_as_of: price.as_of,
    price_delay: "end_of_day",
    price_source: "seeded",
    reason_code: reasonCode,
    reason_text: reasonText,
  });
  if (error) return { error: "That trade could not be recorded. Try again." };

  revalidatePath("/sim");
  return { ok: `${side === "buy" ? "Bought" : "Sold"} ${quantity} at ${price.close.toFixed(2)}, the close on ${price.as_of}.` };
}
