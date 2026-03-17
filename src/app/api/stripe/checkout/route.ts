import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the Pro tier.
 * Returns { url } — redirect the user to this URL.
 *
 * Request body: (empty — no auth yet, anonymous checkout)
 */

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_PAID_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PAID_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        // Capture IP so webhook can unlock paid tier for this user
        // In a real app this would be a user ID from auth
        clientIp:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
