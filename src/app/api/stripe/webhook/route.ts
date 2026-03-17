import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events and records paid subscriptions.
 * Configure in Stripe Dashboard → Webhooks → this URL.
 *
 * Events handled:
 *   - checkout.session.completed  → mark user as paid
 *   - customer.subscription.deleted → revoke paid status
 */

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const clientIp = session.metadata?.clientIp || "unknown";

      console.log(`New Pro subscriber: ${customerId} (IP: ${clientIp})`);

      if (supabase) {
        await supabase.from("subscribers").upsert({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          client_ip: clientIp,
          active: true,
          created_at: new Date().toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription cancelled: ${subscription.id}`);

      if (supabase) {
        await supabase
          .from("subscribers")
          .update({ active: false })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }

    default:
      // Ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
