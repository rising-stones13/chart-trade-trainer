import { NextResponse } from 'next/server';
import { getSecrets } from '@/lib/secrets'; // Secret Manager連携をインポート

export async function GET() {
  try {
    console.log('Attempting to fetch secrets for check-env...');
    const secrets = await getSecrets();
    console.log('Successfully fetched secrets for check-env.');

    // Check if the keys exist and have a value of a certain length
    const secretStatus = {
      FETCHED_FIREBASE_PROJECT_ID: (secrets.FIREBASE_PROJECT_ID?.length || 0) > 0,
      FETCHED_FIREBASE_CLIENT_EMAIL: (secrets.FIREBASE_CLIENT_EMAIL?.length || 0) > 0,
      FETCHED_FIREBASE_PRIVATE_KEY: (secrets.FIREBASE_PRIVATE_KEY?.length || 0) > 0,
      FETCHED_STRIPE_SECRET_KEY: (secrets.STRIPE_SECRET_KEY?.length || 0) > 0,
      FETCHED_STRIPE_WEBHOOK_SECRET: (secrets.STRIPE_WEBHOOK_SECRET?.length || 0) > 0,
    };

    return NextResponse.json({
      message: 'Secret fetch status from Secret Manager',
      secretStatus,
    });

  } catch (error: any) {
    console.error('Error in /api/check-env:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch secrets from Secret Manager',
        message: error.message,
        stack: error.stack, // Include stack trace for better debugging
      },
      { status: 500 }
    );
  }
}
