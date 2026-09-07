# Money Is a Tool — Companion Calculators

**Live site:** https://moneyisatool.ca/ (also reachable via
https://akromi.github.io/MoneyIsATool/, which redirects to the custom domain)

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

## Permanent addresses for the printed book

The QR codes in the book point at short, permanent addresses rather than at
the hash routes above. Each address is a tiny redirect page in this repo that
forwards to the current tool, so a tool can be rebuilt or moved later without
invalidating a single printed copy — only the redirect's destination changes.

| Permanent address | Redirect page | Currently forwards to |
|---|---|---|
| `https://moneyisatool.ca/budget` | `budget/index.html` | `#/budget` |
| `https://moneyisatool.ca/borrow` | `borrow/index.html` | `#/borrow` |
| `https://moneyisatool.ca/savings` | `savings/index.html` | `#/savings` |
| `https://moneyisatool.ca/tax` | `tax/index.html` | `#/tax` |

Print-ready QR files (SVG + 1200 px PNG) for these addresses live in
[`qr/`](qr/README.md). **Never change the addresses**; they are printed in
the book.

## Book & Teacher Resources (gated area)

The digital book and the educator materials need a login, which a static
site cannot provide, so they live in a small companion app in [`app/`](app/README.md):
Next.js on Vercel, Supabase for email sign-in and private file storage,
Stripe Checkout for individual purchases, and owner-created school licences
with a set number of teacher seats. Every download is checked against the
signed-in user's entitlement and PDFs are stamped with the licensee's name.
The calculators here stay free and public. See `app/README.md` for setup.

## Hosting

Everything is static — any static host works. There is no build step.

**GitHub Pages (how this repo deploys):** the
`.github/workflows/pages.yml` workflow publishes the site to the `gh-pages`
branch on every push. Pages itself is configured once in
**Settings → Pages → Build and deployment → Deploy from a branch →
`gh-pages` / root**. After that, every push redeploys automatically. The
`.nojekyll` file is included.

**Custom domain:** the `CNAME` file pins the site to `moneyisatool.ca`.
DNS at the registrar must point the apex at GitHub Pages
(A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153`, plus a `www` CNAME to `akromi.github.io`). After DNS
propagates, enable **Enforce HTTPS** in Settings → Pages.

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
budget/ borrow/
savings/ tax/         permanent redirect pages for the book's QR codes
qr/                   print-ready QR code files (SVG + PNG) for those addresses
app/                  gated Book & Teacher Resources app (deploys to Vercel, not Pages)
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
icon.svg              app icon (+ icon-maskable.svg for Android)
```

*Educational planning tools only — not financial, lending, investment, or tax
advice.*
