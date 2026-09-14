import Link from "next/link";
import Shell from "@/components/Shell";
import { requireTeacher } from "../actions";
import { PriceForm } from "../Forms";
import { lastTradingDay, latestStoredPrices, listInstruments, priceFreshness } from "@/lib/sim/data";

export const metadata = { title: "Closing prices — Canadian Investment Challenge" };

/**
 * Where the real market reaches the simulation.
 *
 * A teacher reads the day's closes off whatever they already use — their
 * broker, a newspaper, the exchange's own site — and types them in. That is
 * deliberate rather than a stopgap apology: an automated feed of TSX prices
 * needs TMX Datalinx's authorisation, and a person typing a number they can
 * see needs nobody's. It also costs about a minute, and the looking-up is
 * itself worth something in a class about investing.
 */
export default async function PricesPage() {
  await requireTeacher();
  const [instruments, previous] = await Promise.all([listInstruments(), latestStoredPrices()]);
  // The last day a close exists for, not the calendar day: on a Sunday the
  // figures a teacher has to hand are Friday's.
  const today = lastTradingDay();

  const stored = Object.fromEntries(
    instruments.map((i) => {
      const p = previous.get(i.id);
      return [i.id, p ? { close: p.close, as_of: p.as_of, source: p.source } : undefined];
    }),
  );

  const fresh = priceFreshness(previous, instruments.map((i) => i.id), today);
  const anyGenerated = instruments.some((i) => (previous.get(i.id)?.source ?? "seeded") !== "manual");

  return (
    <Shell current="teach">
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge</div>
        <h1>Closing prices</h1>
        <p className="muted">
          Every class trades against these. Enter the day&apos;s close for each instrument and the portfolios
          revalue; a student placing a trade pays the newest price held here.
        </p>
        <p><Link href="/teach">← All classes</Link></p>
      </div>

      {fresh.stale && (
        <div className="notice err" style={{ marginBottom: 16 }}>
          {!fresh.oldest ? (
            <>No prices are held yet. Students cannot trade until there is a close for each instrument.</>
          ) : fresh.missing ? (
            <>At least one instrument has no price at all, so it cannot be traded. The rest are priced to{" "}
              <b>{fresh.mixed ? `${fresh.oldest} — ${fresh.newest}` : fresh.oldest}</b>.</>
          ) : fresh.mixed ? (
            <>These are not all priced to the same day: the oldest is <b>{fresh.oldest}</b>, the newest{" "}
              <b>{fresh.newest}</b>. Trades use whatever is newest for each instrument.</>
          ) : (
            <>The newest prices held are from <b>{fresh.oldest}</b>. Until {today}&apos;s are entered, trades will
              use that day&apos;s closes.</>
          )}
        </div>
      )}

      {anyGenerated && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Some instruments are still on the <b>generated</b> series the site was seeded with — invented numbers,
          not real ones. Enter a real close for each and it takes over from then on.
        </div>
      )}

      <section className="card">
        <h2>Enter today&apos;s closes</h2>
        <PriceForm instruments={instruments} previous={stored} today={today} />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>How to do this without it becoming a chore</h2>
        <ul className="tight">
          <li>
            <b>Once a day, after the close.</b> The market closes at 4pm Eastern. Anything entered after that is
            the day&apos;s settled number, so an evening or the next morning is fine.
          </li>
          <li>
            <b>Miss a day and nothing breaks.</b> Trades keep using the newest price held, and portfolios simply
            do not move. That is honest — better than inventing a movement that did not happen.
          </li>
          <li>
            <b>Enter what you can.</b> Blank instruments are skipped, so following three of the five is a
            legitimate way to run a shorter unit.
          </li>
          <li>
            <b>Check the decimal point.</b> A price more than half away from the last one is refused until you
            confirm it. Trades already placed at a wrong price cannot be undone — the ledger is append-only by
            design, because a record students are marked on should not be quietly editable.
          </li>
        </ul>
      </section>
    </Shell>
  );
}
