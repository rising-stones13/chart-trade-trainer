import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get(); // Admin SDKの書き方に変更

    if (!userDoc.exists) { // Admin SDKの書き方に変更
      return new NextResponse('User not found', { status: 404 });
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return new NextResponse('No active subscription found for this user', { status: 400 });
    }

    // Stripeサブスクリプションのキャンセル
    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);

    return NextResponse.json({ success: true, canceledSubscription });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error.type && error.type.startsWith('Stripe')) { // エラーハンドリングを修正
      errorMessage = error.message;
      statusCode = error.statusCode || 500;
      console.error('Stripe Error Code:', error.code);
      console.error('Stripe Error Type:', error.type);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new NextResponse(`Error: ${errorMessage}`, { status: statusCode });
  }
}
