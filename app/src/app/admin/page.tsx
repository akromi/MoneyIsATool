import Shell from "@/components/Shell";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { licenceIsActive, type Licence } from "@/lib/entitlements";
import { siteUrl } from "@/lib/env";
import { LicenceForm, ResourceForm } from "./Forms";
import { setLicenceStatus, updateSeats, markRequestHandled, deleteResource } from "./actions";

export default async function AdminPage() {
  await requireOwner("/admin");
  const admin = createAdminClient();
  const [{ data: licences }, { data: members }, { data: requests }, { data: resources }, { count: purchases }] = await Promise.all([
    admin.from("licences").select("*").order("created_at", { ascending: false }),
    admin.from("licence_members").select("licence_id, role"),
    admin.from("licence_requests").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("resources").select("*").order("audience").order("sort_order"),
    admin.from("purchases").select("id", { count: "exact", head: true }),
  ]);
  const used = new Map<string, number>();
  (members || []).forEach((m) => { if (m.role === "teacher") used.set(m.licence_id, (used.get(m.licence_id) || 0) + 1); });
  const open = (requests || []).filter((r) => !r.handled);

  return (
    <Shell current="admin">
      <div className="hero"><div className="kicker">Owner</div><h1>Administration</h1>
        <p className="muted">{purchases ?? 0} individual purchases · {(licences || []).length} school licences · {open.length} open licence requests</p></div>

      <div className="grid">
        <section className="card"><h2>Create a school licence</h2><LicenceForm /></section>
        <section className="card">
          <h2>Licence requests</h2>
          {open.length === 0 && <p className="muted">No open requests.</p>}
          {open.map((r) => (
            <div className="res" key={r.id}>
              <div>
                <strong>{r.school_name}</strong> — {r.contact_name}, <a href={`mailto:${r.email}`}>{r.email}</a>{r.seats ? `, ~${r.seats} teachers` : ""}
                <div className="faint">{new Date(r.created_at).toLocaleDateString("en-CA")}{r.message ? ` · ${r.message}` : ""}</div>
              </div>
              <form action={markRequestHandled}><input type="hidden" name="id" value={r.id} /><button className="btn secondary small" type="submit">Done</button></form>
            </div>
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>School licences</h2>
        {(licences || []).length === 0 && <p className="muted">None yet.</p>}
        {(licences || []).length > 0 && (
          <div className="tablewrap"><table>
            <thead><tr><th>School</th><th>Administrator</th><th>Seats</th><th>Status</th><th>Invite link</th><th></th></tr></thead>
            <tbody>
              {(licences as Licence[]).map((l) => (
                <tr key={l.id}>
                  <td><b>{l.school_name}</b>{l.notes && <div className="faint">{l.notes}</div>}</td>
                  <td>{l.admin_email}</td>
                  <td>
                    <form action={updateSeats} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="number" name="seats" defaultValue={l.seats} min={1} style={{ width: 70 }} />
                      <button className="btn secondary small" type="submit">Set</button>
                    </form>
                    <div className="faint">{used.get(l.id) || 0} in use</div>
                  </td>
                  <td>{licenceIsActive(l) ? <span className="pill">Active</span> : <span className="pill off">{l.status === "suspended" ? "Suspended" : "Expired"}</span>}<div className="faint">{l.expires_at ? `until ${new Date(l.expires_at).toLocaleDateString("en-CA")}` : "perpetual"}</div></td>
                  <td><span className="code">{siteUrl()}/join/{l.invite_code}</span></td>
                  <td>
                    <form action={setLicenceStatus}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value={l.status === "active" ? "suspended" : "active"} />
                      <button className={`btn small ${l.status === "active" ? "danger" : "secondary"}`} type="submit">{l.status === "active" ? "Suspend" : "Reactivate"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <div className="grid" style={{ marginTop: 16 }}>
        <section className="card">
          <h2>Downloadable resources</h2>
          {(resources || []).length === 0 && <p className="muted">No resources yet. Upload files to the private <code>resources</code> bucket in Supabase, then register them here.</p>}
          {(resources || []).map((r) => (
            <div className="res" key={r.id}>
              <div><span className={`pill ${r.audience === "teacher" ? "brass" : ""}`}>{r.audience}</span> <strong>{r.title}</strong><div className="faint"><code>{r.slug}</code> → {r.storage_path}</div></div>
              <form action={deleteResource}><input type="hidden" name="id" value={r.id} /><button className="btn danger small" type="submit">Remove</button></form>
            </div>
          ))}
        </section>
        <section className="card"><h2>Add or update a resource</h2><ResourceForm /></section>
      </div>
    </Shell>
  );
}
