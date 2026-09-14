// Portfolio arithmetic, checked against hand-worked numbers.
//   node --test src/lib/sim/engine.test.mjs
// Run after `npx tsc src/lib/sim/engine.ts --outDir .test-build --target es2022 --module es2022`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPortfolio } from "../../../.test-build/engine.js";

const ENB = {
  id: "enb", symbol: "ENB.TO", name: "Enbridge Inc.", kind: "stock",
  what_it_is: "", how_you_earn: "", key_risks: "", income_type: "", fits: "",
};
const XBB = { ...ENB, id: "xbb", symbol: "XBB.TO", name: "Bond ETF", kind: "etf" };

const trade = (n, o) => ({
  id: String(n), instrument_id: "enb", side: "buy", quantity: 0, price_used: 0,
  price_as_of: "2026-09-01", reason_code: "income", reason_text: null,
  recorded_at: `2026-09-0${n}T10:00:00Z`, ...o,
});

test("average cost survives a partial sale", () => {
  // Buy 100 @ 60, buy 100 @ 70 (average 65), sell 50 @ 80.
  const trades = [
    trade(1, { side: "buy", quantity: 100, price_used: 60 }),
    trade(2, { side: "buy", quantity: 100, price_used: 70 }),
    trade(3, { side: "sell", quantity: 50, price_used: 80 }),
  ];
  const p = buildPortfolio(25000, trades, [ENB], new Map([["enb", { close: 68.7742, as_of: "2026-09-11" }]]));

  assert.equal(p.cash, 25000 - 6000 - 7000 + 4000);        // 16,000
  assert.equal(p.holdings.length, 1);
  assert.equal(p.holdings[0].quantity, 150);
  assert.equal(p.holdings[0].bookCost, 9750);              // 13,000 − (65 × 50)
  assert.ok(Math.abs(p.invested - 150 * 68.7742) < 1e-9);
  assert.ok(Math.abs(p.value - (16000 + 150 * 68.7742)) < 1e-9);
  assert.ok(Math.abs(p.returnPct - (p.gain / 25000) * 100) < 1e-9);
});

test("selling everything leaves no holding and no stray cost", () => {
  const trades = [
    trade(1, { side: "buy", quantity: 40, price_used: 50 }),
    trade(2, { side: "sell", quantity: 40, price_used: 55 }),
  ];
  const p = buildPortfolio(1000, trades, [ENB], new Map([["enb", { close: 55, as_of: "2026-09-11" }]]));
  assert.equal(p.holdings.length, 0);
  assert.equal(p.invested, 0);
  assert.equal(p.cash, 1000 - 2000 + 2200);
  assert.equal(p.value, 1200);
  assert.equal(p.gain, 200);
});

test("order is by when it was recorded, not the order it arrives in", () => {
  // The same three trades, shuffled. A sale before its purchase would give a
  // different average cost, so this is the guard on that.
  const shuffled = [
    trade(3, { side: "sell", quantity: 50, price_used: 80 }),
    trade(1, { side: "buy", quantity: 100, price_used: 60 }),
    trade(2, { side: "buy", quantity: 100, price_used: 70 }),
  ];
  const p = buildPortfolio(25000, shuffled, [ENB], new Map([["enb", { close: 70, as_of: "2026-09-11" }]]));
  assert.equal(p.holdings[0].bookCost, 9750);
});

test("an instrument with no price yet is held but not valued", () => {
  const trades = [trade(1, { side: "buy", quantity: 10, price_used: 30, instrument_id: "xbb" })];
  const p = buildPortfolio(1000, trades, [ENB, XBB], new Map());
  assert.equal(p.holdings.length, 1);
  assert.equal(p.holdings[0].marketValue, null);
  assert.equal(p.holdings[0].gain, null);
  assert.equal(p.invested, 0);
  assert.equal(p.cash, 700);
});

test("no trades means the starting amount, untouched", () => {
  const p = buildPortfolio(25000, [], [ENB], new Map([["enb", { close: 60, as_of: "2026-09-11" }]]));
  assert.equal(p.value, 25000);
  assert.equal(p.gain, 0);
  assert.equal(p.returnPct, 0);
  assert.equal(p.priceAsOf, null);
});
