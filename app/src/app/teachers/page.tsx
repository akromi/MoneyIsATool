import Link from "next/link";
import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TeachersPage() {
  const user = await requireUser("/teachers");
  const ent = await getEntitlements(user);

  if (!ent.teacher) {
    return (
      <Shell current="teachers">
        <div className="hero"><div className="kicker">Teacher Resources</div><h1>For licensed schools</h1></div>
        <div className="card" style={{ maxWidth: 640 }}>
          <p>Teacher Resources — the classroom PowerPoint, Teacher Guide, Flexible Implementation Guide, test and question bank and more — are included with a school licence.</p>
          <p><Link className="btn" href="/school-licence">Request a school licence</Link></p>
          <p className="faint">Already licensed? Ask your school&apos;s licence administrator for the invite link, then sign in with the same email.</p>
        </div>
      </Shell>
    );
  }

  const admin = createAdminClient();
  const { data: resources } = await admin.from("resources").select("*").in("audience", ["teacher", "book"]).order("sort_order");
  const teacher = (resources || []).filter((r) => r.audience === "teacher");
  const book = (resources || []).filter((r) => r.audience === "book");

  return (
    <Shell current="teachers">
      <div className="hero"><div className="kicker">Teacher Resources</div><h1>Everything for the classroom</h1>
        <p className="muted">Licensed to your school. Files are for your own teaching use and are not to be shared outside the licence.</p></div>
      <div className="card">
        <h2>Educator materials</h2>
        {teacher.length === 0 && <p className="muted">Materials are being uploaded and will appear here shortly.</p>}
        {teacher.map((r) => (
          <div className="res" key={r.id}>
            <div><strong>{r.title}</strong>{r.description && <div className="faint">{r.description}</div>}</div>
            <a className="btn small" href={`/api/files/${r.slug}`}>Download</a>
          </div>
        ))}
      </div>
      {book.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Digital book</h2>
          {book.map((r) => (
            <div className="res" key={r.id}>
              <div><strong>{r.title}</strong>{r.description && <div className="faint">{r.description}</div>}</div>
              <a className="btn small" href={`/api/files/${r.slug}`}>Download</a>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
