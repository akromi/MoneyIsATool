import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

export function stripe(): Stripe {
  return new Stripe(env("STRIPE_SECRET_KEY"));
}
