import Link from "next/link";
import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getEntitlements, licenceIsActive } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatorsUrl } from "@/lib/env";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const user = await requireUser("/account");
  const ent = await getEntitlements(user);
  const admin = createAdminClient();
  const { data: books } = await admin.from("resources").select("*").eq("audience", "book").order("sort_order");

  const adminOf = ent.memberships.filter((m) => m.role === "admin");

  return (
    <Shell current="account">
      <div className="hero">
        <div className="kicker">My access</div>
        <h1>{user.fullName ? `Welcome, ${user.fullName}` : user.email}</h1>
      </div>

      {denied === "file" && <div className="notice err">Your account does not include that resource.</div>}
      {denied === "1" && <div className="notice err">That page is for the site owner.</div>}

      <div className="grid">
        <section className="card">
          <h2>Digital book</h2>
          {ent.book ? (
            <>
              {(books || []).length === 0 && <p className="muted">The digital edition will appear here as soon as it is published.</p>}
              {(books || []).map((r) => (
                <div className="res" key={r.id}>
                  <div><strong>{r.title}</strong>{r.description && <div className="faint">{r.description}</div>}</div>
                  <a className="btn small" href={`/api/files/${r.slug}`}>Download</a>
                </div>
              ))}
              <p className="faint">Each download is licensed to you and carries your name. Please don&apos;t share it.</p>
            </>
          ) : (
            <>
              <p className="muted">No purchase is linked to <b>{user.email}</b> yet.</p>
              <form action="/api/checkout" method="post"><button className="btn" type="submit">Buy the digital book</button></form>
              <p className="faint">Bought with a different email? Sign out and sign in with that address.</p>
            </>
          )}
        </section>

        <section className="card">
          <h2>Financial Decision Tools</h2>
          <p>The companion calculators are free and run privately in your browser.</p>
          <p><a className="btn secondary" href={calculatorsUrl()}>Open the calculators</a></p>
        </section>

        <section className="card">
          <h2>Teacher Resources</h2>
          {ent.teacher ? (
            <p><Link className="btn" href="/teachers">Open Teacher Resources</Link></p>
          ) : (
            <p className="muted">Available with a school licence. <Link href="/school-licence">Request one for your school</Link>, or ask your school&apos;s licence administrator for the invite link.</p>
          )}
        </section>
      </div>

      {ent.memberships.length > 0 && (
        <section className="card plain" style={{ marginTop: 18 }}>
          <h3>Your school licences</h3>
          <div className="tablewrap"><table>
            <thead><tr><th>School</th><th>Your role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {ent.memberships.map((m) => (
                <tr key={m.licence.id}>
                  <td>{m.licence.school_name}</td>
                  <td>{m.role === "admin" ? "Licence administrator" : "Teacher"}</td>
                  <td>{licenceIsActive(m.licence) ? <span className="pill">Active{m.licence.expires_at ? ` until ${new Date(m.licence.expires_at).toLocaleDateString("en-CA")}` : ""}</span> : <span className="pill off">{m.licence.status === "suspended" ? "Suspended" : "Expired"}</span>}</td>
                  <td>{m.role === "admin" && <Link href={`/account/school?licence=${m.licence.id}`}>Manage teachers →</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {adminOf.length > 0 && <p className="faint">As licence administrator you can invite teachers, see who has a seat, and remove access.</p>}
        </section>
      )}
    </Shell>
  );
}
