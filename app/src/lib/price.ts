import "server-only";
import { unstable_cache } from "next/cache";
import { stripe } from "@/lib/stripe";

/** Human-readable price of the individual book, read from Stripe so the
 *  landing page always matches what checkout charges. Cached for an hour;
 *  returns null (and shows nothing) if Stripe is not configured yet. */
export const bookPriceLabel = unstable_cache(
  async (): Promise<string | null> => {
    try {
      const id = process.env.STRIPE_PRICE_INDIVIDUAL;
      if (!id || !process.env.STRIPE_SECRET_KEY) return null;
      const p = await stripe().prices.retrieve(id);
      if (p.unit_amount == null) return null;
      const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency: p.currency.toUpperCase() }).format(p.unit_amount / 100);
      return `${amount} ${p.currency.toUpperCase()}`;
    } catch {
      return null;
    }
  },
  ["book-price"],
  { revalidate: 3600 }
);
