"use client";

import { useActionState, useState } from "react";
import { placeTrade } from "./actions";
import type { SimState } from "./actions";
import type { Instrument } from "@/lib/sim/engine";

type Priced = Instrument & { price: number | null; held: number };

export default function TradeForm({
  instruments,
  reasons,
  sellReasons,
  tradingOpen,
}: {
  instruments: Priced[];
  reasons: Record<string, string>;
  sellReasons: Record<string, string>;
  tradingOpen: boolean;
}) {
  const [state, action, pending] = useActionState<SimState, FormData>(placeTrade, {});
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [pick, setPick] = useState(instruments[0]?.id || "");
  const chosen = instruments.find((i) => i.id === pick);
  const list = side === "buy" ? reasons : sellReasons;

  if (!tradingOpen) {
    return <div className="notice">Your teacher has paused trading. You can still look at your portfolio and your history.</div>;
  }

  return (
    <form action={action} className="stack">
      {state.error && <div className="notice err">{state.error}</div>}
      {state.ok && <div className="notice ok">{state.ok}</div>}

      <div className="row">
        <label style={{ flex: 1 }}>
          I want to
          <select name="side" value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label style={{ flex: 2 }}>
          Investment
          <select name="instrument" value={pick} onChange={(e) => setPick(e.target.value)}>
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.symbol} — {i.name}
                {side === "sell" && i.held > 0 ? ` (you hold ${i.held})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Units
          <input name="quantity" inputMode="decimal" required placeholder="10" />
        </label>
      </div>

      {chosen && (
        <div className="card" style={{ background: "var(--surface2)", boxShadow: "none" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
            {chosen.symbol} · {chosen.price != null ? `$${chosen.price.toFixed(2)}` : "no price yet"}
          </p>
          <dl className="res" style={{ margin: 0 }}>
            <dt>What it is</dt><dd>{chosen.what_it_is}</dd>
            <dt>How you may earn</dt><dd>{chosen.how_you_earn}</dd>
            <dt>Key risks</dt><dd>{chosen.key_risks}</dd>
            <dt>Income type</dt><dd>{chosen.income_type}</dd>
            <dt>Where it fits</dt><dd>{chosen.fits}</dd>
          </dl>
        </div>
      )}

      <label>
        Why are you {side === "buy" ? "buying" : "selling"} this?
        <span className="hint">Recorded with the trade. Your teacher reads these.</span>
        <select name="reason" required defaultValue="">
          <option value="" disabled>Choose a reason…</option>
          {Object.entries(list).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>
        Anything to add? <span className="hint">Optional, one line.</span>
        <input name="reason_text" maxLength={200} placeholder="My goal needs income before I need growth" />
      </label>

      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Recording…" : `Place ${side}`}</button></div>
      <p className="faint">
        Orders use the most recent closing price. Prices in this slice are generated for teaching, not live market data.
      </p>
    </form>
  );
}
