import Link from "next/link";
import { getUser, isOwner } from "@/lib/auth";
import { calculatorsUrl } from "@/lib/env";

export default async function Shell({ children, current }: { children: React.ReactNode; current?: string }) {
  const user = await getUser();
  const owner = isOwner(user);
  const item = (href: string, label: string, key: string) => (
    <Link href={href} aria-current={current === key ? "page" : undefined}>{label}</Link>
  );
  return (
    <>
      <header className="top">
        <div className="topbar">
          <Link href="/" className="brand">
            <span>
              <span className="bname">Money Is a Tool</span>
              <span className="bsub">Book &amp; Teacher Resources</span>
            </span>
          </Link>
          <nav className="tabs" aria-label="Sections">
            <a href={calculatorsUrl()}>Calculators</a>
            {user ? item("/account", "My access", "account") : item("/", "Buy the book", "home")}
            {user ? item("/teachers", "Teacher Resources", "teachers") : item("/school-licence", "Schools", "school")}
            {owner && item("/admin", "Admin", "admin")}
            {user ? (
              <form action="/auth/signout" method="post" style={{ display: "inline" }}>
                <button className="linkish" type="submit" style={{ padding: "6px 10px", textDecoration: "none", color: "var(--ink-soft)", fontWeight: 600 }}>Sign out</button>
              </form>
            ) : item("/login", "Sign in", "login")}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <p>Educational planning tools only — not financial, lending, investment, or tax advice. Files are licensed to the purchaser and are not for redistribution.</p>
      </footer>
    </>
  );
}
