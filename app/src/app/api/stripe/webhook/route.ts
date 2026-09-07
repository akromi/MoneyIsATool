import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { sendSignInLink } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Fulfils a paid checkout: records the purchase and emails a sign-in link. */
export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, env("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    return NextResponse.json({ error: `bad signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true, pending: true });

    const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    if (!email) return NextResponse.json({ error: "no email on session" }, { status: 400 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();

    const { error } = await admin.from("purchases").upsert(
      {
        email,
        user_id: profile?.id ?? null,
        product: (session.metadata?.product as string) || "individual",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
        amount_total: session.amount_total,
        currency: session.currency,
      },
      { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Email a sign-in link (creates the account if it does not exist yet).
    await sendSignInLink(email, "/account");
  }

  return NextResponse.json({ received: true });
}
