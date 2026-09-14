import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import { requireTeacher } from "../actions";
import { AddStudentForm, CopyButton, ResetPasscodeForm } from "../Forms";
import { regenerateJoinCode, setClassSettings } from "../actions";
import { classById, latestStoredPrices, portfolioFor, studentsIn, tradesFor, tradingDayInToronto } from "@/lib/sim/data";
import { REASONS, SELL_REASONS, money, qty } from "@/lib/sim/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

export const metadata = { title: "Class — Canadian Investment Challenge" };

export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const user = await requireTeacher();
  const klass = await classById(classId);
  // A class that is not this teacher's is not found, rather than forbidden:
  // there is no reason to confirm that somebody else's class id exists.
  if (!klass || klass.teacher_id !== user.id) notFound();

  const students = await studentsIn(classId);
  const rows = await Promise.all(
    students.map(async (s) => ({
      student: s,
      portfolio: await portfolioFor(s.id, klass.starting_cash),
      trades: await tradesFor(s.id),
    })),
  );

  const { data: instruments } = await createAdminClient().from("sim_instruments").select("id, symbol");
  const symbolOf = new Map((instruments || []).map((i) => [i.id, i.symbol]));

  // Ranked for the teacher whatever the class setting says. What the setting
  // governs is whether a student's own page is ever sent this.
  const ranked = [...rows].sort((a, b) => b.portfolio.value - a.portfolio.value);

  /* A join code is useless without somewhere to type it. The address was never
     shown here, so a teacher could set a class up and have nothing to put on
     the board. Written out in full, because it is going to be read aloud or
     copied into a class post, not clicked. */
  /* Every value on this page is only as current as the newest close held, and
     a teacher reading a ranking deserves to know when that was. */
  const prices = await latestStoredPrices();
  const pricedTo = [...prices.values()].map((p) => p.as_of).sort().pop();
  const pricesStale = !pricedTo || pricedTo < tradingDayInToronto();

  const joinUrl = `${siteUrl()}/sim/join`;
  const handout = [
    `Go to ${joinUrl}`,
    `Class code: ${klass.join_code}`,
    "Your name: exactly as your teacher entered it",
    "Passcode: the one you were given",
  ].join("\n");

  return (
    <Shell current="teach">
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge</div>
        <h1>{klass.name}</h1>
        <p className="muted">
          Join code <code>{klass.join_code}</code> · {students.length} student{students.length === 1 ? "" : "s"} ·
          {" "}starting amount {money(klass.starting_cash)}
        </p>
        <p className={pricesStale ? "" : "muted"}>
          Valued at closing prices from <b>{pricedTo || "— none entered"}</b>.{" "}
          <Link href="/teach/prices">{pricesStale ? "Enter today\u2019s closes" : "Update them"}</Link>
        </p>
        <p><Link href="/teach">← All classes</Link> · <Link href="/teach/help">Running the Challenge</Link></p>
      </div>

      <section className="card">
        <h2>What to give your students</h2>
        <p className="muted">Three things get them in. The first two are the same for everybody.</p>
        <dl className="handout">
          <dt>The address</dt>
          <dd><a href={joinUrl}>{joinUrl.replace(/^https?:\/\//, "")}</a></dd>
          <dt>Class code</dt>
          <dd><code>{klass.join_code}</code></dd>
          <dt>Their passcode</dt>
          <dd className="muted">
            Different for each student, shown once when you add them below. Lost one? Reset it in the table
            further down &mdash; the new passcode signs the old session out.
          </dd>
        </dl>
        <p className="faint">Students are never asked for an email address, and they do not create an account.</p>
        <CopyButton text={handout} />
      </section>

      <section className="card">
        <h2>Class settings</h2>
        <form action={setClassSettings} className="stack">
          <input type="hidden" name="class_id" value={classId} />
          <div className="row">
            <label style={{ flex: 1 }}>
              Leaderboard
              <span className="hint">Hidden means the ranking is never sent to a student&apos;s browser, not merely hidden on the page.</span>
              <select name="leaderboard_mode" defaultValue={klass.leaderboard_mode}>
                <option value="hidden">Hidden from students</option>
                <option value="top">Show the top few</option>
                <option value="full">Show the full class</option>
              </select>
            </label>
            <label className="row" style={{ alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="trading_open" defaultChecked={klass.trading_open} />
              Trading is open
            </label>
            <div style={{ alignSelf: "end" }}><button className="btn" type="submit">Save</button></div>
          </div>
        </form>
        <form action={regenerateJoinCode} style={{ marginTop: 10 }}>
          <input type="hidden" name="class_id" value={classId} />
          <button className="linkish" type="submit">Generate a new join code</button>
          <span className="faint"> — students already on the roster stay in.</span>
        </form>
      </section>

      <section className="card">
        <h2>Add a student</h2>
        <AddStudentForm classId={classId} />
      </section>

      <section className="card">
        <h2>Every portfolio</h2>
        <p className="muted">Ranked by value. This is yours to see; what students see is set above.</p>
        {rows.length === 0 ? (
          <p className="faint">No students yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Value</th><th>Cash</th><th>Gain or loss</th><th>Return</th><th>Holdings</th><th>Trades</th><th></th></tr></thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.student.id}>
                    <td>{i + 1}</td>
                    <td><b>{r.student.display_name}</b></td>
                    <td>{money(r.portfolio.value)}</td>
                    <td>{money(r.portfolio.cash)}</td>
                    <td style={{ color: r.portfolio.gain > 0.004 ? "var(--pos)" : r.portfolio.gain < -0.004 ? "var(--neg)" : undefined }}>{money(r.portfolio.gain)}</td>
                    <td>{r.portfolio.returnPct == null ? "—" : `${r.portfolio.returnPct >= 0 ? "+" : "−"}${Math.abs(r.portfolio.returnPct).toFixed(2)}%`}</td>
                    <td>{r.portfolio.holdings.length}</td>
                    <td>{r.trades.length}</td>
                    <td><ResetPasscodeForm classId={classId} studentId={r.student.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>What they did, and why</h2>
        <p className="muted">
          The reason is recorded with each trade. A student who wrote &ldquo;I am not sure yet&rdquo; six times is
          telling you something a portfolio value cannot.
        </p>
        {rows.every((r) => r.trades.length === 0) ? (
          <p className="faint">No trades yet.</p>
        ) : (
          rows.filter((r) => r.trades.length > 0).map((r) => (
            <div key={r.student.id} style={{ marginBottom: 18 }}>
              <h3 style={{ marginBottom: 6 }}>{r.student.display_name}</h3>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>When</th><th>What</th><th>Units</th><th>Price used</th><th>Priced</th><th>Why</th></tr></thead>
                  <tbody>
                    {r.trades.map((t) => (
                      <tr key={t.id}>
                        <td>{new Date(t.recorded_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</td>
                        <td><span className={`pill${t.side === "sell" ? " off" : ""}`}>{t.side === "buy" ? "Buy" : "Sell"}</span> {symbolOf.get(t.instrument_id) || "—"}</td>
                        <td>{qty(t.quantity)}</td>
                        <td>{money(t.price_used)}</td>
                        <td className="faint">close, {t.price_as_of}</td>
                        <td>{(t.side === "buy" ? REASONS : SELL_REASONS)[t.reason_code] || t.reason_code}
                          {t.reason_text && <div className="faint">“{t.reason_text}”</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </Shell>
  );
}
