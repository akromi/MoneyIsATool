import Link from "next/link";
import Shell from "@/components/Shell";
import { requireTeacher } from "../actions";
import { siteUrl } from "@/lib/env";

export const metadata = { title: "Running the Challenge — Money Is a Tool" };

/**
 * The playbook. Written for whoever is actually running a class — a teacher on
 * their first morning, or whoever is supporting them from the admin side.
 *
 * Kept in the site rather than in a document because the thing it describes
 * changes, and a PDF on somebody's desktop does not.
 */
export default async function TeachHelpPage() {
  await requireTeacher();
  const joinUrl = `${siteUrl()}/sim/join`.replace(/^https?:\/\//, "");

  return (
    <Shell current="teach">
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge</div>
        <h1>Running the Challenge</h1>
        <p className="muted">
          How the simulation works, what to do each day, what to say when something goes wrong, and what to tell
          a principal who asks what data you are holding on their students.
        </p>
        <p><Link href="/teach">← All classes</Link></p>
      </div>

      <section className="card">
        <h2>What this is</h2>
        <p>
          Each student is given a fictional household and an amount of virtual money. They can buy and sell five
          Canadian securities at real closing prices, and every trade asks them <b>why</b>. Nothing here is a real
          investment, no real money is involved, and no order reaches any market.
        </p>
        <p>
          The point is not to find the student who picks the best stock. Over eight weeks that is mostly luck,
          and rewarding it teaches the opposite of what the book argues. The point is the reason attached to each
          trade, and the conversation that comes out of reading them.
        </p>
        <h3>What it deliberately is not</h3>
        <ul className="tight">
          <li>
            <b>Not live prices.</b> One closing price per day, entered by you. There is no minute-by-minute
            trading, because a simulation that rewards watching a screen all day teaches watching a screen all day.
          </li>
          <li><b>Not advice.</b> The instrument cards explain how a thing works and what can go wrong with it. None of them says buy.</li>
          <li><b>Not a student account.</b> Students have no email address and no login of their own — see below.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Your first class, start to finish</h2>
        <ol className="tight">
          <li>
            <b>Create the class.</b> On <Link href="/teach">All classes</Link>, give it a name you will recognise
            on a list — the period, not just the subject — and a starting amount. $25,000 is the default; the
            figure only matters in that everyone gets the same one.
          </li>
          <li>
            <b>Add your students by name.</b> Type the name exactly as the student will type it — sign-in matches
            on it. Each one gets a passcode, <b>shown once</b>. Write them down as you go, or paste them straight
            into whatever you hand out. They cannot be shown again; they can be reset.
          </li>
          <li>
            <b>Enter a closing price for each instrument.</b> On <Link href="/teach/prices">Closing prices</Link>.
            Until you do, the class is trading against the invented series the site was seeded with.
          </li>
          <li>
            <b>Give out three things.</b> The address <code>{joinUrl}</code>, the class code, and each student&apos;s
            own passcode. The class page has all of this with a button that copies it for a class post.
          </li>
          <li>
            <b>Decide about the leaderboard</b> before the first lesson, not after. It starts hidden. See below.
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>The daily job: closing prices</h2>
        <p>
          This is the only thing that needs doing regularly, and it takes about a minute. After the market closes
          at 4pm Eastern, read the day&apos;s closing price for each instrument from wherever you normally look, and
          enter them on <Link href="/teach/prices">Closing prices</Link>.
        </p>
        <ul className="tight">
          <li><b>Miss a day and nothing breaks.</b> Trades keep using the newest price held. Portfolios simply do not move that day, which is honest.</li>
          <li><b>A student trades at the newest price held</b>, not at a price they choose, so nobody gains by trading at a particular moment.</li>
          <li>
            <b>Check the decimal point.</b> A price more than half away from the last one is refused until you
            confirm it. A trade placed at a wrong price cannot be taken back: the ledger is append-only on
            purpose, because a record students are marked on should not be quietly editable. The repair is an
            offsetting trade, in the open.
          </li>
          <li><b>Prices are shared by every class.</b> The close of a share on a given day is one fact, not a per-class opinion — so a number you enter is the number another teacher&apos;s class trades against too.</li>
        </ul>
      </section>

      <section className="card">
        <h2>The leaderboard, and why it starts hidden</h2>
        <p>
          Three settings, per class: <b>hidden</b>, <b>show the top few</b>, or <b>show the full class</b>. Hidden
          means the ranking is never sent to a student&apos;s browser at all — not merely hidden on the page — so it
          cannot be dug out.
        </p>
        <p>
          Hidden is the default because a visible ranking changes behaviour immediately and predictably: students
          who are behind take bigger risks to catch up, which is the exact lesson the book spends a chapter
          arguing against. <b>Show the top few</b> is the usual compromise. Whatever you choose, you still see
          every portfolio ranked on your own page — the setting only governs what reaches a student.
        </p>
      </section>

      <section className="card">
        <h2>What to actually read</h2>
        <p>
          The <b>What they did, and why</b> section on each class page is where the teaching is. Every trade
          carries the reason the student gave, in their own words, at the moment they made it.
        </p>
        <ul className="tight">
          <li>A student who wrote &ldquo;I am not sure yet&rdquo; six times is telling you something no portfolio value can.</li>
          <li>A student who bought a single company because they had heard of it, and said so, has handed you the lesson on diversification.</li>
          <li>A student whose reasons change from &ldquo;it went up&rdquo; to &ldquo;it pays a dividend and I want income&rdquo; has learned the thing.</li>
        </ul>
        <p className="muted">
          A defensible mark comes from the reasons and the reflection, not from the return. Two students can make
          identical, sound decisions and finish a month apart on luck alone.
        </p>
      </section>

      <section className="card">
        <h2>When something goes wrong</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>What happened</th><th>What to do</th></tr></thead>
            <tbody>
              <tr>
                <td>A student lost their passcode.</td>
                <td>Reset it from the roster on the class page. The new one is shown once, and it signs out any session using the old one.</td>
              </tr>
              <tr>
                <td>A student cannot sign in and insists the passcode is right.</td>
                <td>Check the name. Sign-in matches the name you entered, ignoring capitals but not spelling or extra words. Re-add or reset rather than guessing.</td>
              </tr>
              <tr>
                <td>The class code got out.</td>
                <td>Generate a new one on the class page. Students already on the roster stay in; nobody can join with the old code.</td>
              </tr>
              <tr>
                <td>You entered a price wrongly.</td>
                <td>Enter the right one for the same day — it replaces the wrong one, and portfolios revalue. Trades already placed keep the price they were made at, which is the point of the ledger.</td>
              </tr>
              <tr>
                <td>A student traded by mistake.</td>
                <td>They place an offsetting trade. Nothing is deleted, and the reason on both is part of the record.</td>
              </tr>
              <tr>
                <td>You want the class to stop trading.</td>
                <td>Turn off <b>Trading is open</b> on the class page. Portfolios stay visible and keep revaluing; no new trades are accepted.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>What is stored, and what is not</h2>
        <p>
          This is the answer for a principal, a board privacy officer, or a parent. It is short on purpose,
          because the system was built to make it short.
        </p>
        <p><b>Held about a student:</b> the name you typed, the class they are in, a passcode stored only as a
          one-way hash, the fictional household details they fill in themselves, and their trades with reasons.</p>
        <p><b>Not held:</b> no email address, no student number, no date of birth, no school record, no
          IP-based profile, no advertising or analytics trackers. Students never create an account, so there is no
          account to be breached, resold, or followed to another site.</p>
        <p>
          Everything sits in a database hosted in Canada. If you use initials or first names on the roster instead
          of full names, the system holds no direct identifier at all — and it works exactly the same.
        </p>
        <p className="muted">
          Deleting a class removes its students and their trades permanently. Export anything you need for marking
          first; it cannot be undone.
        </p>
      </section>

      <section className="card">
        <h2>Prices, and why a person types them in</h2>
        <p>
          Real-time and delayed TSX prices are licensed by TMX Datalinx, and redistributing them — which is what
          an automatic feed on a website does — needs their authorisation. A teacher reading a closing price off a
          screen they already have and typing it into their own classroom does not.
        </p>
        <p>
          So the manual entry is a deliberate design, not a placeholder waiting for a licence. It keeps the
          simulation on real numbers, it keeps the cost at nothing, and looking a price up is itself a small part
          of the lesson.
        </p>
      </section>
    </Shell>
  );
}
