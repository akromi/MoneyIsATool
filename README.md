# Money Is a Tool — Companion Calculators

A single-page web app that brings the four Excel companion calculators from
*Money Is a Tool — A Household Financial Decision Guide* to the web, ready for
the QR codes in the published edition to point at.

**One page, four Decision Tools:**

| Route | Tool | Source workbook |
|---|---|---|
| `#/budget` | My Monthly Household Budget + Pay Period Check-In | `Money_Is_a_Tool_Household_Budget_Simplified_1.xlsx` |
| `#/borrow` | Borrowing & Payment Calculator (4 sections) | `Money_Is_a_Tool_Borrowing_and_Payment_Calculator.xlsx` |
| `#/savings` | Savings & Goal Calculator (2 sections) | `Money_Is_a_Tool_Savings_and_Goal_Calculator_v2.xlsx` |
| `#/tax` | Income & Tax Planning Calculator (4 sections, 2026 Ontario prototype) | `Money_Is_a_Tool_Income_and_Tax_Planning_Calculator_v5.xlsx` |

Each tool keeps its workbook's framing: the *Why are we completing this / How
will this help us / When should we return to it* panel, the guidance notes, the
**MY FINANCIAL REMINDER**, and the **IMPORTANT** disclaimer are carried over
verbatim.

## Features

- **Installable PWA** — `manifest.webmanifest` + `sw.js` make it work offline
  and installable to a phone's home screen ("Add to Home Screen").
- **Private by design** — no server, no analytics, no network calls. Entries are
  saved in the browser's `localStorage` only, with reset buttons per tool and a
  global "clear everything" control.
- **Deep links for QR codes** — every calculator has a stable hash route
  (e.g. `https://your-domain/#/savings`), so each book chapter's QR code can
  open its own tool directly.
- **Light and dark themes**, responsive layout, and printable budget.
- **Teaching visuals** — loan cost composition, offer A/B comparison, savings
  growth over time, budget category bars, and the tax chapter's
  "income filling buckets" bracket diagram.

## Hosting

Everything is static — any static host works.

**GitHub Pages:** Settings → Pages → deploy from branch, root folder. The
`.nojekyll` file is included. The app is a single `index.html` plus the PWA
files; there is no build step.

## Faithfulness to the workbooks

All formulas were transcribed from the Excel files and are verified against the
workbooks' own calculated values (61 checks — payment, effective annual rate,
totals, savings growth, required saving, federal/Ontario tax, health premium,
CPP/EI, budget row rules). Notes:

- **Borrowing** converts quoted rate + compounding to an effective annual rate,
  then to a per-payment rate, exactly as the workbook does.
- **Savings** uses the workbook's simple per-period rate (annual ÷ periods).
- **Tax** implements the 2026 Ontario prototype: progressive federal/Ontario
  brackets, federal BPA phase-out, Canada employment amount, Ontario BPA credit,
  Ontario tax reduction, Ontario health premium, plus a CPP/CPP2/EI payroll
  reference. One deliberate difference: the workbook's RRSP and two-job sections
  use dollar-rounded closed-form bracket constants; this app computes every
  section from the same progressive bracket tables, so those sections can differ
  from the spreadsheet by under $1 (and respond correctly when tax data is
  edited).
- **Tax year & rate information** — like the workbook's *Update Tax Rates*
  sheet, all brackets, rates, personal amounts, CPP and EI figures are editable
  in the app (persisted locally, with a "Restore 2026 Ontario figures" reset).
  The Ontario health premium schedule and tax-reduction structure are built in.

## Repository layout

```
index.html            the entire app (markup, styles, logic — no dependencies)
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
icon.svg              app icon (+ icon-maskable.svg for Android)
```

*Educational planning tools only — not financial, lending, investment, or tax
advice.*
