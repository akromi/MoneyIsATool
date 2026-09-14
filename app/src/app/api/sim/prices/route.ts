import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Appends one close per instrument per business day.
 *
 * The seed migration only wrote prices up to the day it ran, so without this
 * the newest close never changed: portfolios froze, and every trade recorded
 * the same increasingly stale price. A simulation whose prices do not move
 * teaches nothing.
 *
 * The walk is deliberately generated and marked `seeded`. Swapping in a real
 * vendor feed means changing where `close` comes from and setting `source` —
 * the rest of the system, which only ever reads the newest row, does not care.
 *
 * Runs from a Vercel Cron entry on weekdays. Safe to call repeatedly: a day
 * already written is left alone.
 */

export const dynamic = "force-dynamic";

/** Same shape as the seed: a slow swing, a faster ripple, and a gentle drift. */
function nextClose(base: number, phase: number, drift: number, step: number): number {
  const value =
    base *
    (1 + 0.1 * Math.sin(step / 9 + phase) + 0.04 * Math.sin(step / 2.7 + phase * 2) + 0.0009 * step * drift);
  return Math.round(value * 10000) / 10000;
}

const SHAPE: Record<string, { base: number; phase: number; drift: number }> = {
  "ENB.TO": { base: 63, phase: 0, drift: 1 },
  "RY.TO": { base: 178, phase: 1.3, drift: 1 },
  "SHOP.TO": { base: 142, phase: 2.6, drift: 2.4 },
  "XIC.TO": { base: 42, phase: 3.9, drift: 1 },
  "XBB.TO": { base: 29, phase: 5.2, drift: -0.6 },
};

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export async function GET(request: Request) {
  // Vercel Cron signs its calls. Anything else gets nothing: this writes rows.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "not authorised" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: instruments } = await admin.from("sim_instruments").select("id, symbol");
  if (!instruments?.length) return NextResponse.json({ written: 0, note: "no instruments" });

  const today = new Date();
  if (isWeekend(today)) return NextResponse.json({ written: 0, note: "market closed" });
  const asOf = today.toISOString().slice(0, 10);

  let written = 0;
  for (const instrument of instruments) {
    const shape = SHAPE[instrument.symbol];
    if (!shape) continue;

    const { count } = await admin
      .from("sim_prices")
      .select("as_of", { count: "exact", head: true })
      .eq("instrument_id", instrument.id);

    const { error } = await admin.from("sim_prices").insert({
      instrument_id: instrument.id,
      as_of: asOf,
      close: nextClose(shape.base, shape.phase, shape.drift, (count || 0) + 1),
      source: "seeded",
    });
    // A duplicate key means today is already written, which is the expected
    // result of a retry rather than a problem.
    if (!error) written += 1;
  }

  return NextResponse.json({ as_of: asOf, written });
}
