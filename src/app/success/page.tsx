'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // 支払いが成功した後の追加処理があればここに記述
    // 例: サーバーサイドでsession_idを検証し、ユーザーの購読ステータスを更新するAPIを呼び出す
    if (sessionId) {
      console.log('Payment successful with session ID:', sessionId);
      // ここでsession_idを使ってバックエンドAPIを呼び出すことができます
    }
  }, [sessionId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <CheckCircle className="text-green-500 w-24 h-24 mb-6" />
      <h1 className="text-4xl font-bold mb-4 text-center">支払いが完了しました！</h1>
      <p className="text-lg mb-8 text-center">プレミアムプランへの登録が完了しました。全ての機能をご利用いただけます。</p>
      {sessionId && (
        <p className="text-sm text-muted-foreground mb-8">セッションID: {sessionId}</p>
      )}
      <Link href="/" passHref>
        <Button size="lg">ホームに戻る</Button>
      </Link>
    </div>
  );
}
