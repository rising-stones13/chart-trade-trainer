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
        const subscriptionIdFromSession = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId) {
          console.error('User ID not found in checkout session metadata');
          break;
        }

        if (!customerId || typeof customerId !== 'string') {
          console.error('Customer ID not found in checkout session');
          break;
        }

        const userRef = db.collection('users').doc(userId);
        console.log(`Attempting to grant premium access for user ${userId}...`);

        const updateData: { isPremium: boolean; stripeCustomerId: string; stripeSubscriptionId?: string; currentPeriodEnd?: number | null } = {
          isPremium: true,
          stripeCustomerId: customerId,
        };

        if (subscriptionIdFromSession) {
          // Stripe API から Subscription オブジェクトの全詳細を取得
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionIdFromSession);
            updateData.stripeSubscriptionId = subscription.id;
            updateData.currentPeriodEnd = subscription.current_period_end;
          } catch (retrieveError) {
            console.error('Error retrieving subscription details:', retrieveError);
            // サブスクリプション詳細の取得に失敗しても処理は続行
          }
        }
        
        await userRef.update(updateData);
        console.log(`Successfully granted premium access to user ${userId}`);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const MAX_RETRIES = 5;
        const RETRY_DELAY_MS = 2000; // 2秒

        let userFound = false;
        for (let i = 0; i < MAX_RETRIES; i++) {
          const usersRef = db.collection('users');
          const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();

          if (!snapshot.empty) {
            for (const doc of snapshot.docs) {
              const updateData: { stripeSubscriptionId: string; currentPeriodEnd?: number | null } = {
                stripeSubscriptionId: subscription.id,
              };

              if (subscription.current_period_end !== undefined && subscription.current_period_end !== null) {
                updateData.currentPeriodEnd = subscription.current_period_end;
              } else {
                updateData.currentPeriodEnd = null; 
              }
              
              await doc.ref.update(updateData);
              console.log(`Updated subscription ID for user ${doc.id}: ${subscription.id}`);
            }
            userFound = true;
            break; // ユーザーが見つかり、更新が完了したらループを抜ける
          }

          console.log(`User with Stripe customer ID ${customerId} not found (retry ${i + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }

        if (!userFound) {
          console.error(`Failed to find user with Stripe customer ID ${customerId} after ${MAX_RETRIES} retries for subscription creation.`);
        }
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
          await doc.ref.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
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