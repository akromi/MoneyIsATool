import Link from "next/link";
import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { NewClassForm } from "./Forms";

export const metadata = { title: "My classes — Canadian Investment Challenge" };

export default async function TeachPage() {
  const user = await requireUser("/teach");
  const ent = await getEntitlements(user);
  if (!ent.teacher) {
    return (
      <Shell current="teach">
        <div className="hero"><div className="kicker">Canadian Investment Challenge</div><h1>For licensed schools</h1></div>
        <div className="card" style={{ maxWidth: 640 }}>
          <p>Running a class is included with a school licence, alongside the Teacher Resources.</p>
          <p><Link className="btn" href="/school-licence">Request a school licence</Link></p>
          <p className="faint">Already licensed? Ask your school&apos;s licence administrator for the invite link, then sign in with the same email.</p>
        </div>
      </Shell>
    );
  }

  const { data } = await createAdminClient()
    .from("sim_classes")
    .select("id, name, join_code, starting_cash, leaderboard_mode, trading_open, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });
  const classes = data || [];

  return (
    <Shell current="teach">
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge</div>
        <h1>My classes</h1>
        <p className="muted">
          A simulation with virtual money. Students join with a class code and a passcode you hand out —
          they are never asked for an email address.
        </p>
        <p className="muted">
          They go to <a href={`${siteUrl()}/sim/join`}><b>{siteUrl().replace(/^https?:\/\//, "")}/sim/join</b></a>.
          Each class page has the code and a copy of the instructions.
        </p>
        <p>
          <Link className="btn secondary" href="/teach/prices">Enter closing prices</Link>{" "}
          <Link className="btn secondary" href="/teach/help">Running the Challenge</Link>
        </p>
      </div>

      <section className="card">
        <h2>Start a class</h2>
        <NewClassForm />
      </section>

      <section className="card">
        <h2>Classes</h2>
        {classes.length === 0 ? (
          <p className="muted">No classes yet. Create one above and you will get a code to give your students.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Class</th><th>Join code</th><th>Starting amount</th><th>Trading</th><th>Leaderboard</th><th></th></tr></thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td><code>{c.join_code}</code></td>
                    <td>${Number(c.starting_cash).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</td>
                    <td>{c.trading_open ? <span className="pill">Open</span> : <span className="pill off">Paused</span>}</td>
                    <td>{c.leaderboard_mode === "hidden" ? "Hidden from students" : c.leaderboard_mode === "top" ? "Top few shown" : "Full class shown"}</td>
                    <td><Link href={`/teach/${c.id}`}>Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}
