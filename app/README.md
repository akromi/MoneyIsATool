# Money Is a Tool — Book & Teacher Resources (gated area)

The part of moneyisatool.ca that needs a login: the digital book for
individual purchasers, and the Teacher Resources for licensed schools.
The free calculators stay on the static site; this app lives at
**app.moneyisatool.ca** and links back to them.

| Who | Gets |
|---|---|
| Individual purchase (Stripe Checkout) | Digital book (PDF, stamped with the buyer's name) + free calculators |
| School licence (invoiced, created by the owner in `/admin`) | Everything above plus the Teacher Resources, for up to *N* teacher accounts managed by the school's licence administrator |

**How files are protected.** Files sit in a *private* Supabase Storage
bucket and have no public URL. Every download goes through
`/api/files/<slug>`, which checks the signed-in user's entitlement on each
request. PDFs are stamped on every page with the licensee's name and
email before they are sent; other file types (PowerPoint, Word) are handed
out through a one-minute signed link. Sharing a link therefore leads to a
sign-in screen, not a file.

## Stack

Next.js 15 (App Router, server actions) · Supabase (email sign-in links,
Postgres, private Storage) · Stripe Checkout + webhook · pdf-lib for
stamping · deployed on Vercel. No CSS framework; the stylesheet reuses the
calculators' design tokens.

## Pages

| Path | Purpose |
|---|---|
| `/` | Buy the book / request a school licence |
| `/login` | Email sign-in link (no passwords) |
| `/account` | What you have; book download; your school licences |
| `/account/school` | Licence administrator: invite link, teachers with seats, remove a teacher |
| `/teachers` | Teacher Resources (school licence only) |
| `/join/<code>` | A teacher claims a seat with the school's invite link |
| `/school-licence` | Quote request form for schools |
| `/admin` | Owner only: create/suspend licences, set seats, handle requests, register uploaded files |
| `/api/checkout` | Starts Stripe Checkout |
| `/api/stripe/webhook` | Records the purchase, emails the sign-in link |
| `/api/files/<slug>` | Protected download |

## One-time setup

1. **Supabase** — create a project. In *SQL Editor* run
   `supabase/migrations/0001_init.sql` (creates tables, row-level security,
   and the private `resources` bucket). In *Authentication → URL
   configuration* set the Site URL to `https://app.moneyisatool.ca` and add
   `https://app.moneyisatool.ca/auth/confirm` to the redirect list. In
   *Authentication → Email templates* the "Magic Link" template's link must
   be `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/account`.
   Supabase's built-in mailer is only for testing (a few emails per hour),
   so before launch add a custom SMTP provider (e.g. Resend, free tier)
   under *Authentication → SMTP settings* — every purchase and every
   sign-in depends on that email arriving.
2. **Stripe** — create a product "Money Is a Tool — digital book" with a
   one-time CAD price; copy its `price_...` id. Add a webhook endpoint
   `https://app.moneyisatool.ca/api/stripe/webhook` for the events
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`;
   copy its signing secret.
3. **Vercel** — import this repository, set *Root Directory* to `app`, add
   the variables from `.env.example`, and assign the domain
   `app.moneyisatool.ca` (a CNAME at the registrar, as Vercel instructs).
   Selling requires the Pro plan; Hobby is for non-commercial use.
4. **Owner access** — put your email in `OWNER_EMAILS`, sign in, open `/admin`.
5. **Upload the files** — Supabase → Storage → `resources` bucket, e.g.
   `book/money-is-a-tool.pdf`, `teachers/classroom-powerpoint.pptx`. Then
   register each one in `/admin → Add or update a resource` with a slug,
   title and audience (*book* or *teacher*).

## Replacing the book (or any file) later

Upload the new file over the same storage path. Nothing else changes:
every existing customer's next download is the new edition, and no
link in the world had the file in it to begin with.

## Running locally

```
cp .env.example .env.local   # fill in test keys
npm install
npm run dev                  # http://localhost:3000
stripe listen --forward-to localhost:3000/api/stripe/webhook   # optional
```

`npm run typecheck` and `npm run build` are the checks to run before pushing.
