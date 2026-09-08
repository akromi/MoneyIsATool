# Money Is a Tool — technical guide

How the site is put together, and how to look after it.

Written to be followed by someone who is not a developer. Where a step needs
care, it says so. Nothing in this file is a password or a key: it names where
each value lives, never the value itself.

---

## 1. What runs where

| Address | What it is | Runs on |
| --- | --- | --- |
| `moneyisatool.ca` | The free calculators. One self-contained page, no accounts, no server. | Vercel project **moneyisatool-calculators** |
| `www.moneyisatool.ca` | Redirects to the address above. | Vercel |
| `app.moneyisatool.ca` | The book and Teacher Resources. Sign-in, purchases, downloads, admin. | Vercel project **money-is-a-tool** |

Both come from one GitHub repository, `akromi/MoneyIsATool`. The calculators
are built from the repository root; the book area is built from the `app`
folder.

Everything a visitor types into the calculators stays in their own browser. The
personal data the project stores is all in the book area: an email address, what
was purchased, school licence details, and a download log recording which
account downloaded which file, and when. IP addresses are deliberately not
kept.

---

## 2. The accounts involved

| Service | What it holds | Why it matters |
| --- | --- | --- |
| **GitHub** | All the code, and the history of every change. | The source of truth. Both sites rebuild from it. |
| **Vercel** | The two projects that serve the sites. | Where the sites actually run, and where settings and secrets live. |
| **GoDaddy** | The domain name and its DNS records. | Points the domain at Vercel. |
| **Supabase** | Accounts, purchases, licences, and the files behind the paywall. | The database and the private file store. |
| **Stripe** | Payments. | Takes the money and tells the site a purchase happened. |
| **Resend** | Sends the sign-in emails. | Without it, nobody can sign in. |

---

## 3. How a change reaches the live site

1. Work happens on a branch and is opened as a pull request.
2. Checks run automatically on the pull request.
3. Merging the pull request into `main` is what publishes.
4. Both Vercel projects notice the merge and rebuild. It takes about a minute.

There is no separate "publish" button. Merging is publishing.

To undo a bad change quickly, open the Vercel project, go to **Deployments**,
find the last good one, and choose **Promote to Production** from its menu. That
is faster than fixing the code, and can be done while the real fix is prepared.

---

## 4. GitHub

- Repository: `akromi/MoneyIsATool`
- Default branch: `main`
- Both Vercel projects are connected to this repository.

**Do not commit secrets.** Keys and passwords belong in Vercel's environment
variables, never in the code.

### GitHub Pages, now retired

The site was served by GitHub Pages until the move to Vercel. The workflow that
published it, the `CNAME` file and the `gh-pages` branch have all been removed,
so nothing force-pushes that branch any more and Vercel has nothing stale to
try to build.

If **Settings → Pages → Source** still names a branch, set it to *None*. The
`gh-pages` branch itself can be deleted whenever you like.

---

## 5. Vercel

Two projects, both connected to the same repository.

### moneyisatool-calculators

| Setting | Value |
| --- | --- |
| Root Directory | *(repository root, left empty)* |
| Framework Preset | Other |
| Build Command | `bash scripts/build-static.sh` |
| Output Directory | `dist` |
| Domains | `moneyisatool.ca` (Production), `www.moneyisatool.ca` (308 redirect to it) |

The build script copies only the files that should be public. The book area,
the workflows and the README are deliberately left out.

### money-is-a-tool

| Setting | Value |
| --- | --- |
| Root Directory | `app` |
| Framework Preset | Next.js |
| Domains | `app.moneyisatool.ca` |

### Environment variables

Set under **Settings → Environment Variables** in each project. Values are
never written down here; the right-hand column says where to get each one.

**money-is-a-tool** (the book area):

| Name | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API keys (the publishable one) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys (the secret one). **Server only. Never share.** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → the endpoint → Signing secret |
| `STRIPE_PRICE_INDIVIDUAL` | Stripe → Products → the digital book → the **price** ID, which starts `price_` |
| `NEXT_PUBLIC_SITE_URL` | `https://app.moneyisatool.ca` |
| `NEXT_PUBLIC_CALCULATORS_URL` | `https://moneyisatool.ca` |
| `OWNER_EMAILS` | The email addresses allowed into `/admin`, separated by commas |
| `BETA_PASSWORD` | Optional. Set it to close the site during beta; delete it to open the site. |

**moneyisatool-calculators**:

| Name | Where the value comes from |
| --- | --- |
| `BETA_PASSWORD` | Optional, and must match the one above so a single password covers both sites. |

Names beginning `NEXT_PUBLIC_` are visible in the browser by design. Everything
else must stay secret.

Changing a variable does not take effect until the project is redeployed:
**Deployments → the top one → Redeploy**.

---

## 6. GoDaddy DNS

Manage at **My Products → moneyisatool.ca → DNS**. These are the records that
matter:

| Type | Name | Value | Purpose |
| --- | --- | --- | --- |
| A | `@` | `216.150.1.1` | Points the domain at Vercel |
| CNAME | `www` | the target Vercel shows for `www` | The www address |
| CNAME | `app` | `cname.vercel-dns.com` | The book area |
| MX, TXT | `send`, `resend._domainkey`, and similar | as set by Resend | Sign-in emails |

Two warnings:

- **Do not switch the nameservers to Vercel.** Use DNS records only. Changing
  nameservers would take the email records with it.
- **Do not delete the `send` and `resend._domainkey` records.** They are what
  let sign-in emails arrive rather than land in junk.

If Vercel ever shows different values than the ones above, use Vercel's. It
tells you the exact record under **Settings → Domains → View DNS configuration**.

---

## 7. Supabase

One project, `moneyisatool`, in the Canadian region.

### What is in it

| Table | Holds |
| --- | --- |
| `profiles` | One row per account |
| `purchases` | Individual book purchases, matched by email |
| `licences` | School licences: school name, seats, status, expiry |
| `licence_members` | Which teachers belong to which licence |
| `resources` | The list of downloadable files and who may see each |
| `downloads` | A record of each download: the account, the file and the time. No IP address is kept. |
| `licence_requests` | Enquiries from the school licence form |

Files themselves live in **Storage**, in a private bucket called `resources`.
Private means nobody can reach a file by guessing its address. Downloads are
handed out by the site, one at a time, only after it has checked entitlement.

Row Level Security is switched on, so even with the public key nobody can read
another person's rows.

### Changing the database

Changes are written as numbered files in `app/supabase/migrations/` and applied
in order. Do not edit a migration that has already been applied; add a new one.

### Sign-in emails

Supabase sends them through Resend. Settings live under
**Authentication → Emails → SMTP Settings**. If sign-in emails stop arriving,
this is the first place to look.

---

## 8. Stripe

### What is set up

- A product for the digital book, with a price. The site reads the price from
  Stripe, so changing it in Stripe changes it on the site within the hour.
- A webhook pointing at `https://app.moneyisatool.ca/api/stripe/webhook`,
  subscribed to `checkout.session.completed` and
  `checkout.session.async_payment_succeeded`.

The webhook is how a purchase becomes an account. Without it, someone can pay
and never receive their book. If purchases stop being recorded, check the
webhook first: Stripe → Developers → Webhooks shows every attempt and its
response.

### Test mode and live mode

Stripe keeps two entirely separate sets of everything. Test mode uses card
number `4242 4242 4242 4242` with any future expiry date.

**Going live** means repeating the setup in live mode and swapping three
values. See section 10.

---

## 9. Resend

Sends the sign-in emails, using the verified domain `moneyisatool.ca`.

The API key is used in one place only: Supabase's SMTP settings, as the
password. To rotate it: create a new key in Resend, paste it into Supabase,
save, send yourself a sign-in link to confirm it works, then delete the old key.

---

## 10. Routine tasks

### Replace the book file with a new edition

1. Supabase → Storage → `resources`, upload the new PDF.
2. app.moneyisatool.ca/admin → "Add or update a resource".
3. Use the **same slug** as before, `book`, and give the new storage path.

Everyone who has bought the book gets the new edition next time they download.
Their links do not change, because downloads go through the site rather than
straight to the file.

### Add a Teacher Resources file

The same, but choose audience **teacher** and give it its own slug. Teacher
files are only ever visible to members of an active school licence.

### Create a school licence

app.moneyisatool.ca/admin → "Create licence". Enter the school, the
administrator's email, and the number of teacher seats. The administrator does
not consume a seat. They receive an invite code to pass to their teachers.

### Add or remove an owner admin

Edit `OWNER_EMAILS` in the **money-is-a-tool** Vercel project, then redeploy.
Owners can do everything: create licences, manage files, see all requests.

### Turn the beta password on or off

- **On:** add `BETA_PASSWORD` to *both* Vercel projects with the same value,
  then redeploy each.
- **Off, at launch:** delete the variable from both projects and redeploy.

The password is checked on the server. Changing it immediately signs everyone
out. Stripe's webhook is deliberately exempt, so purchases keep being recorded
even while the gate is up.

### Go live with real payments

1. In Stripe, switch off test mode and recreate the product and price.
2. Create the webhook again in live mode, same address and same two events.
3. In Vercel, replace `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and
   `STRIPE_PRICE_INDIVIDUAL` with the live values.
4. Redeploy.
5. Buy the book yourself with a real card, confirm the email arrives and the
   download works, then refund yourself in Stripe.

### Change the price

Change it in Stripe and update `STRIPE_PRICE_INDIVIDUAL` if you created a new
price rather than editing the old one. The site shows the Stripe price, so the
two can never disagree for long.

---

## 11. When something goes wrong

| Symptom | Most likely cause | What to do |
| --- | --- | --- |
| The whole site is unreachable | A DNS record was changed or removed | Compare GoDaddy against section 6 |
| Browser warns about the certificate | A certificate is still being issued after a DNS change | Wait up to an hour; it resolves itself |
| Sign-in emails never arrive | Resend key expired, or the SMTP settings are wrong | Supabase → Authentication → Emails; check junk mail first |
| Someone paid but has no access | The webhook failed | Stripe → Developers → Webhooks; the failed attempt can be resent |
| A change was published but nobody sees it | An old copy cached in the browser | Reload twice, or hard reload. The site fetches fresh pages, so this should be rare |
| "Deployment failed" email from Vercel about `gh-pages` | Left over from GitHub Pages | Should no longer happen: the workflow was removed. If one arrives, check that `.github/workflows/pages.yml` has not come back |

---

## 12. If the site changes hands

Six things to transfer, in rough order of importance:

1. **Stripe** — whoever owns this account receives the money. Set up before launch.
2. **Domain** — GoDaddy account, or transfer the domain out.
3. **Supabase** — holds the customers and the files. Transfer the organisation.
4. **Vercel** — transfer the two projects, or add the new owner to the team.
5. **GitHub** — transfer the repository, or add the new owner as a collaborator.
6. **Resend** — small, and simplest to recreate under the new owner.

Add the new owner to each service before removing anyone, so there is never a
moment when nobody has access.
