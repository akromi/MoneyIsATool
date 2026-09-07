import Link from "next/link";
import Shell from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { licenceIsActive, seatUsage, type Licence } from "@/lib/entitlements";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser(`/join/${code}`);
  const admin = createAdminClient();
  const { data: licence } = await admin.from("licences").select("*").eq("invite_code", code.toUpperCase()).maybeSingle();

  let title = "That invite link is not valid";
  let body: React.ReactNode = <p>Check the link with your school&apos;s licence administrator — it may have been replaced.</p>;

  if (licence) {
    const l = licence as Licence;
    const { data: existing } = await admin.from("licence_members").select("role").eq("licence_id", l.id).eq("user_id", user.id).maybeSingle();
    if (existing) {
      title = `You already have access at ${l.school_name}`;
      body = <p><Link className="btn" href="/teachers">Open Teacher Resources</Link></p>;
    } else if (!licenceIsActive(l)) {
      title = `${l.school_name}'s licence is not active`;
      body = <p>Ask your licence administrator to contact us to renew it.</p>;
    } else {
      const { used } = await seatUsage(l.id);
      if (used >= l.seats) {
        title = `All ${l.seats} teacher seats at ${l.school_name} are taken`;
        body = <p>Ask your licence administrator to free a seat or add more.</p>;
      } else {
        const { error } = await admin.from("licence_members").insert({ licence_id: l.id, user_id: user.id, role: "teacher" });
        if (!error) {
          title = `Welcome to ${l.school_name}`;
          body = <><p>Your account now includes the digital book and the Teacher Resources.</p><p><Link className="btn" href="/teachers">Open Teacher Resources</Link></p></>;
        } else {
          title = "Something went wrong";
          body = <p>{error.message}</p>;
        }
      }
    }
  }

  return (
    <Shell current="teachers">
      <div className="hero"><div className="kicker">School licence</div><h1>{title}</h1></div>
      <div className="card" style={{ maxWidth: 640 }}>{body}</div>
    </Shell>
  );
}
