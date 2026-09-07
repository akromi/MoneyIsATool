import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/account", error } = await searchParams;
  const user = await getUser();
  if (user) redirect(next.startsWith("/") ? next : "/account");
  return (
    <Shell current="login">
      <div className="hero"><h1>Sign in</h1><p className="muted">Reach your digital book, and your school&apos;s Teacher Resources.</p></div>
      {error && <div className="notice err">That sign-in link is invalid or has expired. Request a new one below.</div>}
      <div className="card" style={{ maxWidth: 600 }}><LoginForm next={next} /></div>
    </Shell>
  );
}
