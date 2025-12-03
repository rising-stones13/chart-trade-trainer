import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSecrets } from '../../../lib/secrets';

// Stripeの初期化をここで行わない

export async function POST(req: Request) {
  try {
    // 1. まずSecret Managerから秘密情報を取得
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found in Secret Manager.');
    }

    // 2. 取得したキーを使ってStripeを初期化
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { userId, userEmail } = await req.json();

    if (!userId || !userEmail) {
      return new NextResponse('User ID and Email are required', { status: 400 });
    }

    // Stripe Checkout Sessionの作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'プレミアムプラン',
              description: 'すべての機能が利用可能になります。',
            },
            unit_amount: 980,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      metadata: {
        userId: userId,
        userEmail: userEmail,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    // エラーメッセージをより詳細に返す
    return new NextResponse(`Error creating checkout session: ${error.message}`, { status: 500 });
  }
}
