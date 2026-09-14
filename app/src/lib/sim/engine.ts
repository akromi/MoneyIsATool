/**
 * Portfolio arithmetic, replayed from the ledger.
 *
 * Nothing here is stored. Holdings, cash and return are all derived from the
 * trades as they were written, using the price each trade actually used. That
 * is the whole point of an append-only ledger: a student's history cannot
 * quietly change because the market moved, and a mark given in January still
 * reproduces in June.
 */

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
  kind: "stock" | "etf" | "bond";
  what_it_is: string;
  how_you_earn: string;
  key_risks: string;
  income_type: string;
  fits: string;
};

export type Trade = {
  id: string;
  instrument_id: string;
  side: "buy" | "sell";
  quantity: number;
  price_used: number;
  price_as_of: string;
  reason_code: string;
  reason_text: string | null;
  recorded_at: string;
};

export type Holding = {
  instrument: Instrument;
  quantity: number;
  /** What the student paid in total for the shares still held, average-cost. */
  bookCost: number;
  lastPrice: number | null;
  marketValue: number | null;
  gain: number | null;
};

export type Portfolio = {
  startingCash: number;
  cash: number;
  holdings: Holding[];
  invested: number;
  value: number;
  gain: number;
  returnPct: number | null;
  priceAsOf: string | null;
};

export const REASONS: Record<string, string> = {
  growth: "Long-term growth",
  income: "Income",
  diversification: "Diversification",
  lower_risk: "Lower risk",
  goal: "Fits my financial goal",
  recent: "Recent performance",
  someone: "Recommendation from someone else",
  unsure: "I am not sure yet",
};

export const SELL_REASONS: Record<string, string> = {
  rebalance: "Rebalancing",
  risk: "Reacting to risk",
  goal_change: "My goal changed",
  take_gain: "Taking a gain",
  market: "Responding to market movement",
  other: "Another reason",
};

/**
 * Average cost, which is what Canadian tax rules use for identical shares and
 * so the only basis worth teaching here.
 */
export function buildPortfolio(
  startingCash: number,
  trades: Trade[],
  instruments: Instrument[],
  latest: Map<string, { close: number; as_of: string }>,
): Portfolio {
  const byId = new Map(instruments.map((i) => [i.id, i]));
  const pos = new Map<string, { quantity: number; bookCost: number }>();
  let cash = startingCash;

  // Oldest first: order matters, because a sell removes cost at the average
  // cost at that moment, not at today's.
  const ordered = [...trades].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

  for (const t of ordered) {
    const cur = pos.get(t.instrument_id) || { quantity: 0, bookCost: 0 };
    const cashFlow = t.quantity * t.price_used;
    if (t.side === "buy") {
      cash -= cashFlow;
      cur.quantity += t.quantity;
      cur.bookCost += cashFlow;
    } else {
      const unitCost = cur.quantity > 0 ? cur.bookCost / cur.quantity : 0;
      cash += cashFlow;
      cur.quantity -= t.quantity;
      cur.bookCost -= unitCost * t.quantity;
      if (cur.quantity < 1e-9) {
        cur.quantity = 0;
        cur.bookCost = 0;
      }
    }
    pos.set(t.instrument_id, cur);
  }

  const holdings: Holding[] = [];
  let invested = 0;
  let priceAsOf: string | null = null;

  for (const [id, p] of pos) {
    if (p.quantity <= 0) continue;
    const instrument = byId.get(id);
    if (!instrument) continue;
    const price = latest.get(id) || null;
    const marketValue = price ? p.quantity * price.close : null;
    if (price) priceAsOf = price.as_of;
    if (marketValue != null) invested += marketValue;
    holdings.push({
      instrument,
      quantity: p.quantity,
      bookCost: p.bookCost,
      lastPrice: price ? price.close : null,
      marketValue,
      gain: marketValue == null ? null : marketValue - p.bookCost,
    });
  }

  holdings.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

  const value = cash + invested;
  const gain = value - startingCash;
  return {
    startingCash,
    cash,
    holdings,
    invested,
    value,
    gain,
    returnPct: startingCash > 0 ? (gain / startingCash) * 100 : null,
    priceAsOf,
  };
}

export function money(v: number | null): string {
  if (v == null || !isFinite(v)) return "—";
  const s = Math.abs(v).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < -0.004 ? "−$" : "$") + s;
}

export function qty(v: number): string {
  return v.toLocaleString("en-CA", { maximumFractionDigits: 4 });
}
