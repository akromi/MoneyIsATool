# QR codes for the printed book

Print-ready QR codes. Each one points at a **permanent address** on
moneyisatool.ca that forwards to the current version of the tool, so the
codes stay valid even if a tool is later rebuilt, moved, or replaced.

| Book tool | Permanent address | Files |
|---|---|---|
| My Monthly Household Budget | `https://moneyisatool.ca/budget` | `budget.svg`, `budget.png` |
| My Borrowing & Payment Calculator | `https://moneyisatool.ca/borrow` | `borrow.svg`, `borrow.png` |
| My Savings & Goal Calculator | `https://moneyisatool.ca/savings` | `savings.svg`, `savings.png` |
| My Income & Tax Planning Calculator | `https://moneyisatool.ca/tax` | `tax.svg`, `tax.png` |

## Using them in the book layout

- Prefer the **SVG** (vector, scales to any size with crisp edges). The PNG is
  1200 × 1200 px for tools that cannot place SVG; at 300 dpi it prints at
  about 10 cm / 4 in, so it can be scaled down freely.
- Keep the code at least **2 cm (0.8 in)** wide on the page, black on white,
  and keep the built-in white margin (quiet zone) around it — do not crop it.
- Print the short address under each code (e.g. *moneyisatool.ca/budget*) for
  readers who cannot scan.
- Error correction is level **M**, which tolerates minor print damage or
  smudging.

## Regenerating

The codes and the redirect pages (`/budget/`, `/borrow/`, `/savings/`, `/tax/`)
are generated together by a small Node script (`qrcode` + `sharp`). The
content of a code is only the address, so **never change the addresses**;
change the destination inside the redirect page instead. The site's service
worker never caches these redirect pages, so a changed destination takes
effect on the next scan (within the host's normal 10-minute HTTP cache).
