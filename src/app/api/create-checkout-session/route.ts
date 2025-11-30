import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
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
            currency: 'jpy', // または'jpy'など
            product_data: {
              name: 'プレミアムプラン',
              description: 'すべての機能が利用可能になります。',
            },
            unit_amount: 980, // 例: 980円
            recurring: {
              interval: 'month', // 月額購読
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
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
