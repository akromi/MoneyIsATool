import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import TradeForm from "./TradeForm";
import { leaveSim } from "./actions";
import { currentStudentId } from "@/lib/sim/session";
import { classById, latestPrices, listInstruments, portfolioFor, studentById, tradesFor } from "@/lib/sim/data";
import { REASONS, SELL_REASONS, money, qty } from "@/lib/sim/engine";

export const metadata = { title: "My portfolio — Canadian Investment Challenge" };

export default async function SimPage() {
  const studentId = await currentStudentId();
  if (!studentId) redirect("/sim/join");

  const student = await studentById(studentId);
  if (!student) redirect("/sim/join");
  const klass = await classById(student.class_id);
  if (!klass) redirect("/sim/join");

  const [portfolio, trades, instruments, prices] = await Promise.all([
    portfolioFor(studentId, klass.starting_cash),
    tradesFor(studentId),
    listInstruments(),
    latestPrices(),
  ]);
  const bySymbol = new Map(instruments.map((i) => [i.id, i]));

  const priced = instruments.map((i) => ({
    ...i,
    price: prices.get(i.id)?.close ?? null,
    held: portfolio.holdings.find((h) => h.instrument.id === i.id)?.quantity ?? 0,
  }));

  const tile = (label: string, value: string, tone?: "pos" | "neg") => (
    <div className="card" key={label} style={{ padding: "14px 16px" }}>
      <div className="kicker" style={{ margin: 0 }}>{label}</div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700, fontVariantNumeric: "tabular-nums",
        color: tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : undefined }}>{value}</div>
    </div>
  );

  const tone = portfolio.gain > 0.004 ? "pos" : portfolio.gain < -0.004 ? "neg" : undefined;

  return (
    <Shell>
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge · {klass.name}</div>
        <h1>{student.display_name}</h1>
        <p className="muted">
          Virtual money only. Prices are {portfolio.priceAsOf ? `as of the close on ${portfolio.priceAsOf}` : "end-of-day"},
          and an order you place fills at the next close — you do not know the exact price you will get, which is true of real trading too.
        </p>
        <form action={leaveSim}><button className="linkish" type="submit">Sign out of the class</button></form>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {tile("Starting amount", money(portfolio.startingCash))}
        {tile("Portfolio value", money(portfolio.value))}
        {tile("Cash", money(portfolio.cash))}
        {tile("Invested", money(portfolio.invested))}
        {tile("Gain or loss", money(portfolio.gain), tone)}
        {tile("Return", portfolio.returnPct == null ? "—" : `${portfolio.returnPct >= 0 ? "+" : "−"}${Math.abs(portfolio.returnPct).toFixed(2)}%`, tone)}
      </div>

      <section className="card">
        <h2>What I hold</h2>
        {portfolio.holdings.length === 0 ? (
          <p className="muted">Nothing yet. Every investment below has a card explaining what it is before you buy it.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Investment</th><th>Units</th><th>Last price</th><th>Value</th><th>Book cost</th><th>Gain or loss</th></tr></thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.instrument.id}>
                    <td><b>{h.instrument.symbol}</b><div className="faint">{h.instrument.name}</div></td>
                    <td>{qty(h.quantity)}</td>
                    <td>{h.lastPrice == null ? "—" : money(h.lastPrice)}</td>
                    <td>{money(h.marketValue)}</td>
                    <td>{money(h.bookCost)}</td>
                    <td style={{ color: (h.gain ?? 0) > 0.004 ? "var(--pos)" : (h.gain ?? 0) < -0.004 ? "var(--neg)" : undefined }}>{money(h.gain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Buy or sell</h2>
        <TradeForm instruments={priced} reasons={REASONS} sellReasons={SELL_REASONS} tradingOpen={klass.trading_open} />
      </section>

      <section className="card">
        <h2>Everything I have done</h2>
        <p className="muted">This record cannot be edited or deleted, by you or by anyone else. A mistake is corrected with an opposite trade.</p>
        {trades.length === 0 ? (
          <p className="faint">No trades yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>When</th><th>What</th><th>Units</th><th>Price used</th><th>Priced</th><th>Why</th></tr></thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.recorded_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td><span className={`pill${t.side === "sell" ? " off" : ""}`}>{t.side === "buy" ? "Buy" : "Sell"}</span>{" "}{bySymbol.get(t.instrument_id)?.symbol || "—"}</td>
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
        )}
      </section>
    </Shell>
  );
}
