import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';

export async function POST(req: Request) {
  try {
    // 1. Initialize Firebase Admin and fetch secrets
    const { db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found.');
    }

    // 2. Initialize Stripe inside the handler
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20', // APIバージョンを最新に合わせることを推奨
    });

    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: 'User ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return new NextResponse(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
        return new NextResponse(JSON.stringify({ message: 'No active subscription found for this user' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Stripeサブスクリプションのキャンセル
    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    // WebhookがDBを更新するのを待つので、ここでのレスポンスはシンプルに成功を伝える
    return NextResponse.json({ success: true, status: 'cancellation_initiated' });

  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error.type && error.type.startsWith('Stripe')) {
      errorMessage = error.message;
      statusCode = error.statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // ▼▼▼ 【修正】エラー応答をJSON形式に統一 ▼▼▼
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
