"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { classById } from "@/lib/sim/data";
import { hashPasscode, newJoinCode, newPasscode, newSalt } from "@/lib/sim/session";

export type TeachState = { error?: string; ok?: string };

/** A teacher may only ever touch their own classes. Checked on every action. */
async function ownClass(classId: string) {
  const user = await requireUser("/teach");
  const klass = await classById(classId);
  if (!klass || klass.teacher_id !== user.id) throw new Error("Not your class");
  return klass;
}

export async function createClass(_prev: TeachState, form: FormData): Promise<TeachState> {
  const user = await requireUser("/teach");
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
