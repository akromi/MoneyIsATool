"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { classById, isTradingDay, latestStoredPrices, listInstruments, todayInToronto } from "@/lib/sim/data";
import { money } from "@/lib/sim/engine";
import { hashPasscode, newJoinCode, newPasscode, newSalt } from "@/lib/sim/session";

export type TeachState = { error?: string; ok?: string };

/**
 * Running a class is part of a school licence, so being signed in is not
 * enough: an unpaid account, or one whose licence lapsed, has no business
 * creating or continuing one. Same gate the Teacher Resources page uses.
 */
export async function requireTeacher() {
  const user = await requireUser("/teach");
  const ent = await getEntitlements(user);
  if (!ent.teacher) throw new Error("A school licence is needed to run a class.");
  return user;
}

/** A teacher may only ever touch their own classes. Checked on every action. */
async function ownClass(classId: string) {
  const user = await requireTeacher();
  const klass = await classById(classId);
  if (!klass || klass.teacher_id !== user.id) throw new Error("Not your class");
  return klass;
}

export async function createClass(_prev: TeachState, form: FormData): Promise<TeachState> {
  const user = await requireTeacher();
  const name = String(form.get("name") || "").trim();
  const cash = Number(String(form.get("cash") || "25000").replace(/[$,\s]/g, ""));
  if (!name) return { error: "Give the class a name." };
  if (!isFinite(cash) || cash <= 0) return { error: "Enter the starting amount each student receives." };

  const { error } = await createAdminClient().from("sim_classes").insert({
    teacher_id: user.id,
    name,
    join_code: newJoinCode(),
    starting_cash: cash,
  });
  if (error) return { error: "That class could not be created. Try again." };
  revalidatePath("/teach");
  return { ok: `Created ${name}.` };
}

/**
 * The teacher adds students by name and hands out the passcode. No email
 * address is collected, which is the point: hold no direct identifier and most
 * of the privacy burden never arises.
 */
export async function addStudent(_prev: TeachState, form: FormData): Promise<TeachState> {
  const classId = String(form.get("class_id") || "");
  await ownClass(classId);
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Enter the student's name as it should appear." };

  const passcode = newPasscode();
  const salt = newSalt();
  const { error } = await createAdminClient().from("sim_students").insert({
    class_id: classId,
    display_name: name,
    passcode_salt: salt,
    passcode_hash: hashPasscode(passcode, salt),
  });
  if (error) {
    return { error: error.code === "23505" ? "There is already a student with that name in this class." : "That student could not be added." };
  }
  revalidatePath(`/teach/${classId}`);
  // Shown once. It is stored hashed, so it cannot be read back later — only reset.
  return { ok: `Added ${name}. Passcode: ${passcode} — write it down now, it cannot be shown again.` };
}

export async function resetPasscode(_prev: TeachState, form: FormData): Promise<TeachState> {
  const classId = String(form.get("class_id") || "");
  await ownClass(classId);
  const studentId = String(form.get("student_id") || "");
  const passcode = newPasscode();
  const salt = newSalt();
  const { error } = await createAdminClient()
    .from("sim_students")
    .update({ passcode_salt: salt, passcode_hash: hashPasscode(passcode, salt) })
    .eq("id", studentId)
    .eq("class_id", classId);
  if (error) return { error: "That passcode could not be reset." };
  revalidatePath(`/teach/${classId}`);
  return { ok: `New passcode: ${passcode} — shown once.` };
}

export async function setClassSettings(form: FormData): Promise<void> {
  const classId = String(form.get("class_id") || "");
  await ownClass(classId);
  const mode = String(form.get("leaderboard_mode") || "hidden");
  const open = String(form.get("trading_open") || "") === "on";
  await createAdminClient()
    .from("sim_classes")
    .update({
      leaderboard_mode: ["hidden", "top", "full"].includes(mode) ? mode : "hidden",
      trading_open: open,
    })
    .eq("id", classId);
  revalidatePath(`/teach/${classId}`);
}

/** A leaked code is changed without disturbing anyone already on the roster. */
export async function regenerateJoinCode(form: FormData): Promise<void> {
  const classId = String(form.get("class_id") || "");
  await ownClass(classId);
  await createAdminClient().from("sim_classes").update({ join_code: newJoinCode() }).eq("id", classId);
  revalidatePath(`/teach/${classId}`);
}

/**
 * Records the day's closing prices, typed in by a teacher from a real quote.
 *
 * One set of prices serves every class, because the closing price of a share on
 * a given day is one fact, not a per-class opinion. That also means a number
 * entered here reaches somebody else's students, so it is guarded three ways: a
 * move of more than half the last price has to be confirmed, a close another
 * teacher already entered is never silently replaced, and every row records who
 * put it there.
 *
 * Blank fields are skipped rather than treated as zero — a teacher who follows
 * three of the five instruments should not have to invent the other two.
 */
export async function setPrices(_prev: TeachState, form: FormData): Promise<TeachState> {
  const user = await requireTeacher();
  const asOf = String(form.get("as_of") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return { error: "Pick the trading day these closes are from." };
  if (asOf > todayInToronto()) return { error: "That date is in the future." };
  // No close exists for a day the market did not open.
  if (!isTradingDay(asOf)) return { error: "Markets are shut at the weekend. Pick the Friday, or the trading day these closes are from." };

  const allowLargeMove = form.get("allow_large_move") === "on";
  const replaceExisting = form.get("replace_existing") === "on";

  const admin = createAdminClient();
  const instruments = await listInstruments();
  const previous = await latestStoredPrices();

  // What is already filed under this date, so an existing close is not quietly
  // overwritten by a second teacher entering the same day.
  const { data: onFile } = await admin
    .from("sim_prices")
    .select("instrument_id, close, source")
    .eq("as_of", asOf);
  const existing = new Map((onFile || []).map((r) => [r.instrument_id, { close: Number(r.close), source: r.source }]));

  const rows: { instrument_id: string; as_of: string; close: number; source: string; entered_by: string; entered_at: string }[] = [];
  const queried: string[] = [];
  const clashes: string[] = [];
  let unchanged = 0;

  for (const instrument of instruments) {
    const raw = String(form.get(`price_${instrument.id}`) || "").replace(/[$,\s]/g, "");
    if (raw === "") continue;
    const close = Number(raw);
    if (!isFinite(close) || close <= 0) return { error: `${instrument.symbol}: enter a price above zero, or leave it blank.` };

    const held = existing.get(instrument.id);
    if (held && held.source === "manual") {
      // Entering the same number again is agreement, not a correction.
      if (Math.abs(held.close - close) < 0.00005) { unchanged += 1; continue; }
      if (!replaceExisting) {
        clashes.push(`${instrument.symbol} is already ${money(held.close)}, you entered ${money(close)}`);
        continue;
      }
    }

    // A decimal point in the wrong place is the mistake that matters here: the
    // trades placed against it cannot be taken back off an append-only ledger.
    const last = previous.get(instrument.id);
    if (last && !allowLargeMove && Math.abs(close - last.close) / last.close > 0.5) {
      queried.push(`${instrument.symbol} ${money(last.close)} → ${money(close)}`);
    }

    rows.push({
      instrument_id: instrument.id,
      as_of: asOf,
      close,
      source: "manual",
      entered_by: user.id,
      entered_at: new Date().toISOString(),
    });
  }

  if (queried.length) {
    return {
      error: `That is a move of more than half: ${queried.join(", ")}. Check the decimal point, then tick the box below and save again if it is right.`,
    };
  }
  if (clashes.length) {
    return {
      error: `Somebody has already entered ${asOf} for ${clashes.join("; ")}. Check yours against theirs — every class uses these. Tick the replace box below and save again to correct it.`,
    };
  }
  if (!rows.length) {
    return unchanged
      ? { ok: `Already recorded for ${asOf}. Nothing to change.` }
      : { error: "Enter at least one closing price." };
  }

  const { error } = await admin.from("sim_prices").upsert(rows, { onConflict: "instrument_id,as_of" });
  if (error) return { error: "Those prices could not be saved. Try again." };

  revalidatePath("/teach/prices");
  revalidatePath("/teach");
  return { ok: `Saved ${rows.length} closing price${rows.length === 1 ? "" : "s"} for ${asOf}. Trades placed now use them.` };
}
