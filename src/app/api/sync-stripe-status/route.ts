
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';

export async function POST(req: NextRequest) {
  try {
    // 1. 非同期でFirebase AdminとSecretsを初期化・取得
    const { auth, db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not available from Secret Manager.');
    }

    // 2. このリクエストスコープ内でStripeを初期化
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User document not found in Firestore' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      if (userData?.isPremium) {
        await userDocRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
        console.log(`Corrected user ${userId}: Marked as not premium because they have no Stripe customer ID.`);
      }
      return NextResponse.json({ message: 'User does not have a Stripe customer ID.' });
    }

    // 3. 顧客のサブスクリプションをStripeから取得
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all', // 'active'だけでなく、'canceled'なども含める
      limit: 1, // 最新の1件で十分
    });

    if (subscriptions.data.length === 0) {
      if (userData?.isPremium) {
        await userDocRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
        console.log(`Corrected user ${userId}: Marked as not premium because they have no subscriptions in Stripe.`);
      }
      return NextResponse.json({ message: 'User has a Stripe customer ID but no subscriptions.' });
    }

    const latestSubscription = subscriptions.data[0];
    const isPremium = ['active', 'trialing'].includes(latestSubscription.status);
    const currentPeriodEnd = latestSubscription.current_period_end;
    const subscriptionId = latestSubscription.id;
    
    // 4. Firestoreのデータと比較・更新
    if (
      userData?.isPremium !== isPremium ||
      userData?.stripeSubscriptionId !== subscriptionId ||
      userData?.currentPeriodEnd !== currentPeriodEnd
    ) {
      await userDocRef.update({
        isPremium,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd: currentPeriodEnd,
      });
      console.log(`Updated premium status for user ${userId} to ${isPremium}.`);
      return NextResponse.json({ 
        message: 'User status was outdated and has been updated.',
        updated: true,
        newStatus: { isPremium, subscriptionId, currentPeriodEnd } 
      });
    }

    return NextResponse.json({ message: 'User status is already up-to-date.' });

  } catch (error: any) {
    console.error('Detailed Error in /api/sync-stripe-status:', error);
    // For debugging: return a more detailed error message
    return NextResponse.json({ 
        error: 'An internal error occurred. See details.', 
        message: error.message,
        stack: error.stack, // IMPORTANT: Send stack trace for debugging
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)) // Send the full error object
    }, { status: 500 });
  }
}
