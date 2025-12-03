console.log('[secrets.ts] Module loading started.');

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

console.log('[secrets.ts] SecretManagerServiceClient imported. Initializing client...');
const client = new SecretManagerServiceClient();
console.log('[secrets.ts] SecretManagerServiceClient initialized successfully.');

// この変数は、一度取得したシークレットをメモリにキャッシュするために使用されます。
let cachedSecrets: Record<string, string> | null = null;

// Google Cloudプロジェクトのプロジェクト番号（IDではない）をここに入力してください。
const projectNumber = '300945394050'; 

async function accessSecretVersion(secretName: string): Promise<string> {
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectNumber}/secrets/${secretName}/versions/latest`,
    });

    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload.`);
    }
    return payload;
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    throw new Error(`Could not access secret ${secretName}.`);
  }
}

export async function getSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  console.log('[secrets.ts] getSecrets(): Fetching secrets from Secret Manager...');

  const secretNames = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  try {
    const secretPromises = secretNames.map(name => 
      accessSecretVersion(name).then(value => ({ [name]: value }))
    );
    
    const allSecrets = await Promise.all(secretPromises);

    cachedSecrets = allSecrets.reduce((acc, current) => ({ ...acc, ...current }), {});

    console.log('[secrets.ts] getSecrets(): Successfully fetched and cached secrets.');
    return cachedSecrets;

  } catch (error) {
    console.error('[secrets.ts] getSecrets(): Failed to fetch secrets from Secret Manager:', error);
    // 本番環境では、シークレットがなければアプリケーションをクラッシュさせるべきです。
    throw new Error('Could not fetch secrets, stopping server.');
  }
}
