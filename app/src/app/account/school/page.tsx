import Link from "next/link";
import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { licenceIsActive, type Licence } from "@/lib/entitlements";
import { siteUrl } from "@/lib/env";
import { removeTeacher, regenerateInvite } from "./actions";

export default async function SchoolAdminPage({ searchParams }: { searchParams: Promise<{ licence?: string }> }) {
  const { licence: licenceId } = await searchParams;
  const user = await requireUser("/account/school");
  const admin = createAdminClient();

  const { data: mine } = await admin
    .from("licence_members").select("licence_id, role").eq("user_id", user.id).eq("role", "admin");
  const ids = (mine || []).map((m) => m.licence_id);
  if (ids.length === 0) redirect("/account");
  const id = licenceId && ids.includes(licenceId) ? licenceId : ids[0];

  const [{ data: licence }, { data: members }] = await Promise.all([
    admin.from("licences").select("*").eq("id", id).single(),
    admin.from("licence_members").select("user_id, role, joined_at, profile:profiles(email, full_name)").eq("licence_id", id).order("joined_at"),
  ]);
  const l = licence as Licence;
  const teachers = (members || []).filter((m) => m.role === "teacher");
  const inviteUrl = `${siteUrl()}/join/${l.invite_code}`;
  const active = licenceIsActive(l);

  return (
    <Shell current="account">
      <div className="hero">
        <div className="kicker">School licence</div>
        <h1>{l.school_name}</h1>
        <p className="muted">
          {active ? <span className="pill">Active{l.expires_at ? ` until ${new Date(l.expires_at).toLocaleDateString("en-CA")}` : " (perpetual)"}</span> : <span className="pill off">Not active</span>}
          {" "}· {teachers.length} of {l.seats} teacher seats in use · <Link href="/account">Back to my access</Link>
        </p>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Invite teachers</h2>
          <p>Share this link with the teachers who should have access. Each teacher signs in with their own email and takes one seat.</p>
          <p><span className="code">{inviteUrl}</span></p>
          <p className="faint">Anyone with the link can claim a seat while seats remain. If it leaks, generate a new one — existing teachers keep their access.</p>
          <form action={regenerateInvite}><input type="hidden" name="licence" value={l.id} /><button className="btn secondary small" type="submit">Generate a new link</button></form>
        </section>

        <section className="card">
          <h2>Teachers with access</h2>
          {teachers.length === 0 && <p className="muted">No teachers have joined yet.</p>}
          {teachers.length > 0 && (
            <div className="tablewrap"><table>
              <thead><tr><th>Teacher</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {teachers.map((m) => {
                  const p = m.profile as unknown as { email: string; full_name: string | null } | null;
                  return (
                    <tr key={m.user_id}>
                      <td>{p?.full_name ? <><b>{p.full_name}</b><br /><span className="faint">{p.email}</span></> : p?.email || m.user_id}</td>
                      <td>{new Date(m.joined_at).toLocaleDateString("en-CA")}</td>
                      <td><form action={removeTeacher}><input type="hidden" name="licence" value={l.id} /><input type="hidden" name="user" value={m.user_id} /><button className="btn danger small" type="submit">Remove</button></form></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
          <p className="faint">Removing a teacher frees their seat immediately. Need more seats? Contact us.</p>
        </section>
      </div>
    </Shell>
  );
}
