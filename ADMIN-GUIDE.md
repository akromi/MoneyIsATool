# Money Is a Tool — administrator's guide

Running the site day to day: who gets access and how, what to do when somebody
writes in, and where each control actually lives.

Written for whoever holds the Administration page. Nothing here needs a
developer. Where a job belongs somewhere else — Stripe, Supabase, Vercel — this
says so rather than pretending it can be done from one screen.

<!-- note: A printed copy, correct when it was made. The live version is
     *How the admin page works*, on the Administration page at
     `app.moneyisatool.ca/admin/help`. Where this sheet and that page disagree,
     the page is right. -->

---

## 1. The three ways somebody gets access

Everything about access comes back to these three. When a person cannot get in,
the first question is always which of the three they are.

- **They bought the book.** Stripe tells the site, and the purchase is recorded
  against the email they paid with. They get the book. Nothing for you to do.
- **They are a school's administrator.** You name them when you create the
  licence. They get the book and the Teacher Resources, and they do not use up a
  teacher seat.
- **They are a teacher at a licensed school.** Their administrator gives them
  the invite code. They get the book and the Teacher Resources, and they use one
  seat.

**The single most common support question** comes from the first one: purchases
are matched on the email address. Somebody who buys with one address and signs in
with another will not be recognised, and nothing about the error tells them that.
Check it early.

---

## 2. Who does what

The work is split between you and each school's own administrator. This catches
people out, so it is worth knowing before you answer an email.

| You, on the Administration page | The school's administrator, on their own page |
| --- | --- |
| Create a school licence | Pass the invite code to their teachers |
| Change how many teacher seats it has | Remove a teacher, which frees the seat |
| Set or clear an expiry date — this is how renewals are done | Generate a fresh invite code |
| Suspend a licence, or make it active again | |
| Mark a licence request as handled | |
| Add, update or remove a downloadable file | |

You **cannot** remove a teacher or change an invite code. If a school asks,
point them at their own school page, which they reach from **My access** after
signing in.

---

## 3. School licences in detail

- **Seats count teachers only.** The administrator is extra. Ten seats means the
  administrator plus ten teachers.
- **The invite code** is how teachers join. Generating a new one immediately
  stops the old one working, but teachers who have already joined stay in.
- **Expiry left blank means the licence never expires.** A date in the past ends
  access on its own, with nothing for you to do. Change the date at any time from
  the school licences list — that is how a renewal is done.
- **Suspending** removes access for everyone on the licence straight away, the
  administrator included. Making it active again restores them, and nobody has to
  rejoin — but a licence has to be both active *and* unexpired. If the expiry
  date has gone by in the meantime, give it a new date as well, or the row will
  still read *Expired*.
- **When the seats are full**, the next teacher to try the code is told so by
  name — "All 10 teacher seats at Windsor High are taken". They are not left
  guessing.

---

## 4. When somebody writes in

| What they say | What is usually true, and what to do |
| --- | --- |
| I paid but I cannot get in | Two causes, in this order. First find the payment in Stripe and confirm the site recorded it: if Stripe shows the webhook failing, resend it from there and their access appears without them doing anything. If the payment did register, they are signing in with a different address from the one they paid with — Stripe will show you which. |
| The sign-in email never arrived | Junk mail first, then request a new link. Each link is single use and only works in the browser that asked for it, so an old one will not work twice. |
| Our teachers cannot join | Check the licence. Either the seats are full, in which case add more, or the licence is suspended or past its expiry date. |
| We lost our invite code | It is on the school licences list. Read it back to them, or have their administrator generate a fresh one from their own page. |
| A teacher has left the school | Their administrator removes them, which frees the seat. |
| We want to renew for another year | Set a new expiry date on the licence, or clear the date to stop it expiring at all. Teachers keep their places and nobody rejoins. |
| We want a refund | Refunds happen in Stripe, not on the admin page. Refunding does **not** withdraw access, so if that matters the purchase has to be removed from the database as well. |

---

## 5. Adding or replacing a file

Two steps, and the first happens outside the site.

1. **Upload it to Supabase**, into the private `resources` bucket. Avoid spaces
   in the file name.
2. **Register it on the admin page**, under *Add or update a resource*, giving
   the slug, a title, the audience and the storage path.

**Audience decides who sees it.** Choose *book* for anything every buyer should
get, and *teacher* for material only licensed schools should see.

**To publish a new edition**, upload the new file and save it against the **same
slug**. Everyone who has bought the book gets the new edition the next time they
download, and their links do not change — downloads go through the site rather
than straight to the file.

PDFs are stamped with the reader's name and email on every page as they
download. Other file types are handed over through a link that expires after a
minute.

---

## 6. The Canadian Investment Challenge, from here

Running a class is included with a school licence, alongside the Teacher
Resources. There is no separate product to sell, no separate switch to set: a
school with an active licence can run classes, and one whose licence lapses
cannot.

What that means for you:

- **Nothing to administer per class.** Teachers create their own classes, add
  their own students and hand out their own passcodes.
- **Students never appear in your accounts.** They have no email address and no
  login — a name on a teacher's roster, and a passcode. Nothing to support, and
  nothing of theirs for you to hold.
- **Prices are entered by teachers**, one closing price per instrument per
  trading day, and they are shared by every class. If a school reports a price
  looking wrong, it is a teacher-side job, on the Closing prices page.
- **Suspending a licence stops classes too**, immediately, along with everything
  else on that licence.

Everything else about it — setting a class up, the daily price job, what to tell
a principal about student data — is in *Running the Challenge*, on the teacher
pages, and in the teacher guide.

---

## 7. Deliberately not on the admin page

Not everything belongs on one screen, and knowing where each thing lives saves
hunting for a control that was never there.

| Job | Where it happens |
| --- | --- |
| Refunds, prices, payment records | Stripe |
| Uploading files, looking up an account directly | Supabase |
| Adding another owner administrator | Vercel — an environment variable |
| Opening the site to the public at the end of the beta | Vercel |
| Domains, DNS, email sending | GoDaddy, Vercel and Resend |

All of those are covered in the **technical guide**, which is the companion to
this one and is written for the same reader — someone careful, not someone
technical.
