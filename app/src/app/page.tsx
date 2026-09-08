import Link from "next/link";
import Shell from "@/components/Shell";
import { getUser } from "@/lib/auth";
import { calculatorsUrl } from "@/lib/env";
import { bookPriceLabel } from "@/lib/price";

export default async function Home() {
  const [user, price] = await Promise.all([getUser(), bookPriceLabel()]);
  return (
    <Shell current="home">
      <div className="hero">
        <div className="kicker">Money Is a Tool — A Household Financial Decision Guide</div>
        <h1>The digital book, and everything a classroom needs to teach it.</h1>
        <p className="muted">The Financial Decision Tools are free for everyone at <a href={calculatorsUrl()}>moneyisatool.ca</a>. The digital book and the educator materials are licensed below.</p>
      </div>

      <div className="grid">
        <section className="card">
          <div className="kicker">Individual</div>
          <h2>Digital book</h2>
          <ul className="list">
            <li>The complete digital edition (PDF), licensed to you</li>
            <li>Free companion calculators — budget, borrowing, savings, tax</li>
            <li>Keep it: re-download any time from your account</li>
          </ul>
          {price && <p className="price">{price}</p>}
          <p>
            <form action="/api/checkout" method="post">
              <button className="btn" type="submit">Buy the digital book</button>
            </form>
          </p>
          <p className="faint">Secure payment by Stripe. Your sign-in link is emailed right after purchase.</p>
        </section>

        <section className="card">
          <div className="kicker">Schools</div>
          <h2>School licence</h2>
          <ul className="list">
            <li>Digital book for every licensed teacher</li>
            <li>Classroom PowerPoint, Teacher Guide, Flexible Implementation Guide</li>
            <li>Test and question bank, and other educator resources</li>
            <li>One licence, a set number of teacher accounts, managed by your school</li>
          </ul>
          <p><Link className="btn secondary" href="/school-licence">Request a school licence</Link></p>
          <p className="faint">We invoice schools directly (purchase orders welcome).</p>
        </section>
      </div>

      <section className="card plain" style={{ marginTop: 18 }}>
        <h3>{user ? "You are signed in" : "Already purchased?"}</h3>
        <p>{user ? <Link href="/account">Go to your access page →</Link> : <Link href="/login">Sign in with your email to reach your downloads →</Link>}</p>
      </section>
    </Shell>
  );
}
