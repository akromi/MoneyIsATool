"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { classByJoinCode, classById, currentStudent, latestPrices, portfolioFor, studentByName } from "@/lib/sim/data";
import { REASONS, SELL_REASONS } from "@/lib/sim/engine";
import { endSession, passcodeMatches, startSession } from "@/lib/sim/session";

export type SimState = { error?: string; ok?: string };

/** Class code + name + passcode. No email is asked for, or stored. */
export async function joinClass(_prev: SimState, form: FormData): Promise<SimState> {
  const code = String(form.get("code") || "").trim().toUpperCase();
  const name = String(form.get("name") || "").trim();
  const passcode = String(form.get("passcode") || "").trim();
  if (!code || !name || !passcode) return { error: "Class code, your name and your passcode are all needed." };

  const klass = await classByJoinCode(code);
  if (!klass) return { error: "That class code was not recognised. Check it with your teacher." };

  const student = await studentByName(klass.id, name);

  // One message for both failures: saying which half was wrong tells an
  // outsider whether a name is on the roster.
  if (!student || !passcodeMatches(passcode, student.passcode_salt, student.passcode_hash)) {
    return { error: "That name and passcode do not match this class." };
  }

  await startSession(student.id, student.passcode_hash);
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
  const student = await currentStudent();
  if (!student) return { error: "Your session has ended. Sign in again to keep trading." };
  const studentId = student.id;
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

  // The checks above only produce a friendly message. This is the one that
  // counts: it validates and inserts inside a lock on this student's row, so
  // two requests arriving together cannot both spend the same cash.
  const { error } = await createAdminClient().rpc("sim_place_trade", {
    p_student_id: studentId,
    p_instrument_id: instrumentId,
    p_side: side,
    p_quantity: quantity,
    p_price: price.close,
    p_price_as_of: price.as_of,
    p_reason_code: reasonCode,
    p_reason_text: reasonText,
  });
  if (error) {
    const detail = error.message || "";
    if (detail.includes("not enough cash")) return { error: "That costs more than the cash you have left." };
    if (detail.includes("not enough units")) return { error: "You do not hold that many units." };
    if (detail.includes("trading is paused")) return { error: "Your teacher has paused trading for this class." };
    return { error: "That trade could not be recorded. Try again." };
  }

  revalidatePath("/sim");
  return { ok: `${side === "buy" ? "Bought" : "Sold"} ${quantity} at ${price.close.toFixed(2)}, the close on ${price.as_of}.` };
}
