import Link from "next/link";
import Shell from "@/components/Shell";
import { getUser } from "@/lib/auth";

export default async function ThanksPage() {
  const user = await getUser();
  return (
    <Shell current="account">
      <div className="hero"><div className="kicker">Thank you</div><h1>Your purchase is complete.</h1></div>
      <div className="card" style={{ maxWidth: 640 }}>
        {user ? (
          <p>Your digital book is ready on <Link href="/account">your access page</Link>. If it does not show yet, give it a few seconds and refresh — the payment confirmation arrives moments after checkout.</p>
        ) : (
          <>
            <p>We&apos;ve emailed a sign-in link to the address you paid with. Open it to reach your download. No password is needed.</p>
            <p className="faint">Nothing after a couple of minutes? Check your spam folder, or <Link href="/login">request a fresh link</Link> using the same email.</p>
          </>
        )}
      </div>
    </Shell>
  );
}
