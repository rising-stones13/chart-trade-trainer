import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';

export async function POST(req: NextRequest) {
  let stripe: Stripe;
  let webhookSecret: string;

  try {
    const { db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    webhookSecret = secrets['STRIPE_WEBHOOK_SECRET'];

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error('Stripe secrets not found in Secret Manager.');
    }

    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const payload = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    console.log(`✅ Success: Received event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const subscriptionIdFromSession = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (!userId || !customerId || typeof customerId !== 'string') {
            throw new Error('Missing required metadata (userId or customerId) in checkout session.');
        }

        const userRef = db.collection('users').doc(userId);
        console.log(`Attempting to grant premium access for user ${userId}...`);

        const updateData: any = { isPremium: true, stripeCustomerId: customerId };

        if (subscriptionIdFromSession) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionIdFromSession);
            updateData.stripeSubscriptionId = subscription.id;
            updateData.currentPeriodEnd = subscription.current_period_end;
        }
        
        await userRef.update(updateData);
        console.log(`Successfully granted premium access to user ${userId}`);
        break;
      }

      // ▼▼▼ 【復活】欠落していたキャンセル処理 ▼▼▼
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        // Stripeの顧客IDをもとにユーザーを検索
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).limit(1).get();

        if (snapshot.empty) {
          console.error(`No user found with Stripe customer ID: ${customerId}`);
          break; // ユーザーが見つからなくてもエラーにせず、次の処理に進む
        }

        const userDoc = snapshot.docs[0];
        console.log(`Attempting to revoke premium access for user ${userDoc.id}...`);

        // ユーザーのステータスをフリープランに更新
        await userDoc.ref.update({
          isPremium: false,
          stripeSubscriptionId: null, // サブスクリプションIDをクリア
          currentPeriodEnd: null,     // 契約期間終了日をクリア
        });

        console.log(`Successfully revoked premium access for user ${userDoc.id}`);
        break;
      }
      // ▲▲▲ ここまで ▲▲▲
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error(`Error processing webhook event:`, error);
    return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
  }
}
