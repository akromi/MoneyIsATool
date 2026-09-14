import Link from "next/link";
import Shell from "@/components/Shell";
import { requireOwner } from "@/lib/auth";

export const metadata = { title: "How the admin page works — Money Is a Tool" };

export default async function AdminHelpPage() {
  await requireOwner("/admin/help");
  return (
    <Shell current="admin">
      <div className="hero">
        <div className="kicker">Owner</div>
        <h1>How the admin page works</h1>
        <p className="muted">
          What each control does, who does what, and what to say when somebody writes in.
          For anything to do with servers, domains or keys, see the technical guide in the repository instead.
          For the Canadian Investment Challenge &mdash; running a class, entering prices, what to tell a school
          about student data &mdash; see <Link href="/teach/help">Running the Challenge</Link>.
        </p>
        <p><Link href="/admin">← Back to Administration</Link></p>
      </div>

      <section className="card">
        <h2>The three ways somebody gets access</h2>
        <ul className="list">
          <li><b>They bought the book.</b> Stripe tells the site, and the purchase is recorded against the
            email they paid with. They get the book. Nothing for you to do.</li>
          <li><b>They are a school&apos;s administrator.</b> You name them when you create the licence. They get
            the book and the Teacher Resources, and they do not use up a teacher seat.</li>
          <li><b>They are a teacher at a licensed school.</b> Their administrator gives them the invite code.
            They get the book and the Teacher Resources, and they use one seat.</li>
        </ul>
        <p className="faint">
          Purchases are matched on the email address, so someone who buys with one address and signs in with
          another will not be recognised. That is the single most common support question.
        </p>
      </section>

      <section className="card">
        <h2>Who does what</h2>
        <p>The work is split between you and each school&apos;s own administrator. This catches people out, so
          it is worth knowing before you answer an email.</p>
        <div className="grid">
          <div>
            <h3>You, on this page</h3>
            <ul className="list">
              <li>Create a school licence</li>
              <li>Change how many teacher seats it has</li>
              <li>Set or clear a licence&apos;s expiry date, which is how renewals are done</li>
              <li>Suspend a licence, or make it active again</li>
              <li>Mark a licence request as handled</li>
              <li>Add, update or remove a downloadable file</li>
            </ul>
          </div>
          <div>
            <h3>The school&apos;s administrator, on their own page</h3>
            <ul className="list">
              <li>Pass the invite code to their teachers</li>
              <li>Remove a teacher, which frees the seat</li>
              <li>Generate a fresh invite code</li>
            </ul>
          </div>
        </div>
        <p className="faint">
          You cannot remove a teacher or change an invite code from here. If a school asks, point them at
          their own school page, which they reach from My access after signing in.
        </p>
      </section>

      <section className="card">
        <h2>School licences in detail</h2>
        <ul className="list">
          <li><b>Seats</b> count teachers only. The administrator is extra. Ten seats means the administrator
            plus ten teachers.</li>
          <li><b>The invite code</b> is how teachers join. Generating a new one immediately stops the old one
            working, but teachers who have already joined stay in.</li>
          <li><b>Expiry</b> left blank means the licence never expires. A date in the past ends access on its
            own, with nothing for you to do. You can change the date at any time from the school licences
            list, which is how a renewal is done.</li>
          <li><b>Suspending</b> removes access for everyone on the licence straight away, the administrator
            included. Making it active again restores them, and nobody has to rejoin &mdash; but a licence has
            to be both active and unexpired, so if the expiry date has gone by in the meantime, give it a new
            date as well or the row will still read <i>Expired</i>.</li>
          <li><b>When the seats are full</b>, the next teacher to try the code is told so by name, for example
            &ldquo;All 10 teacher seats at Windsor High are taken&rdquo;. They are not left guessing.</li>
        </ul>
      </section>

      <section className="card">
        <h2>When somebody writes in</h2>
        <table className="qa">
          <thead>
            <tr><th>What they say</th><th>What is usually true, and what to do</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>I paid but I cannot get in</td>
              <td>Two different causes, so check in this order. First, find the payment in Stripe and confirm
                the site actually recorded it: if Stripe shows the webhook failing, resend it from there, and
                their access appears without them doing anything. If the payment did register, they are
                simply signing in with a different address from the one they paid with, which Stripe will
                show you.</td>
            </tr>
            <tr>
              <td>The sign-in email never arrived</td>
              <td>Ask them to check junk mail first, then request a new link. Each link is single use and only
                works in the browser that asked for it, so an old one will not work twice.</td>
            </tr>
            <tr>
              <td>Our teachers cannot join</td>
              <td>Check the licence here. Either the seats are full, in which case add more, or the licence is
                suspended or past its expiry date.</td>
            </tr>
            <tr>
              <td>We lost our invite code</td>
              <td>It is shown on the school licences list below. Read it back to them, or have their
                administrator generate a fresh one from their own page.</td>
            </tr>
            <tr>
              <td>A teacher has left the school</td>
              <td>Their administrator removes them, which frees the seat for somebody else.</td>
            </tr>
            <tr>
              <td>We want to renew for another year</td>
              <td>Set a new expiry date on the licence below, or clear the date to stop it expiring at all.
                Teachers keep their places and nobody rejoins.</td>
            </tr>
            <tr>
              <td>We want a refund</td>
              <td>Refunds happen in Stripe, not here. Refunding does not withdraw their access, so if that
                matters you will need to remove the purchase from the database as well.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Adding or replacing a file</h2>
        <p>Two steps, and the first happens outside this site.</p>
        <ul className="list">
          <li><b>Upload it to Supabase</b>, into the private <code>resources</code> bucket. Avoid spaces in the
            file name.</li>
          <li><b>Register it here</b>, under &ldquo;Add or update a resource&rdquo;, giving the slug, a title,
            the audience and the storage path.</li>
        </ul>
        <p><b>Audience</b> decides who sees it. Choose <i>book</i> for anything every buyer should get, and
          <i> teacher</i> for material only licensed schools should see.</p>
        <p><b>To publish a new edition</b>, upload the new file and save it against the <i>same slug</i>.
          Everyone who has bought the book gets the new edition the next time they download. Their links do
          not change, because downloads go through the site rather than straight to the file.</p>
        <p className="faint">
          PDFs are stamped with the reader&apos;s name and email on every page as they download. Other file
          types are handed over through a link that expires after a minute.
        </p>
      </section>

      <section className="card plain">
        <h3>Things that are deliberately not here</h3>
        <p className="muted">
          Refunds and prices live in Stripe. Uploading files and looking up accounts live in Supabase. Adding
          another owner admin, and opening the site to the public at the end of the beta, are settings in
          Vercel. All of them are covered in the technical guide.
        </p>
        <p><Link href="/admin">← Back to Administration</Link></p>
      </section>
    </Shell>
  );
}
