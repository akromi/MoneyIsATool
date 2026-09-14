import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import JoinForm from "./JoinForm";
import { currentStudent } from "@/lib/sim/data";

export const metadata = { title: "Join your class — Canadian Investment Challenge" };

export default async function JoinPage() {
  if (await currentStudent()) redirect("/sim");
  return (
    <Shell>
      <div className="hero">
        <div className="kicker">Canadian Investment Challenge</div>
        <h1>Join your class</h1>
        <p className="muted">
          A simulation with virtual money. Nothing here is a real investment, and no real money is ever involved.
        </p>
      </div>
      <section className="card" style={{ maxWidth: 460 }}>
        <JoinForm />
      </section>
    </Shell>
  );
}
