import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { env, siteUrl } from "@/lib/env";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Starts a Stripe Checkout for the individual digital-book purchase. */
export async function POST(_request: NextRequest) {
  const user = await getUser();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: env("STRIPE_PRICE_INDIVIDUAL"), quantity: 1 }],
    customer_email: user?.email,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${siteUrl()}/account/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/`,
    metadata: { product: "individual" },
  });
  return NextResponse.redirect(session.url!, { status: 303 });
}
