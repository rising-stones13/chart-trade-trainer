import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';
 
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
}
 
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set in environment variables.');
}
 
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`✅ Success: Received event type: ${event.type}`);

  try {
    switch (event.type) {
      // Handle successful checkout sessions
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer;

        if (!userId) {
          console.error('User ID not found in checkout session metadata');
          break;
        }

        if (!customerId || typeof customerId !== 'string') {
          console.error('Customer ID not found in checkout session');
          break;
        }

        // Grant premium access
        const userRef = db.collection('users').doc(userId);
        console.log(`Attempting to grant premium access for user ${userId}...`);
        // 顧客IDも保存して、将来のサブスクリプション管理に利用します
        await userRef.update({ isPremium: true, stripeCustomerId: customerId });
        console.log(`Successfully granted premium access to user ${userId}`);
        break;
      }

      // Handle subscription cancellations
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

        if (snapshot.empty) {
          console.error(`No user found with Stripe customer ID ${customerId}`);
          break;
        }

        // Revoke premium access for all found users (usually just one)
        for (const doc of snapshot.docs) {
          await doc.ref.update({ isPremium: false });
          console.log(`Revoked premium access for user ${doc.id}`);
        }
        break;
      }

      default:
        // console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed. View logs for details.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};