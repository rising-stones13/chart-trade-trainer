'use client';

import ChartTradeTrainer from '@/components/chart-trade-trainer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { user, userData, logOut, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {user ? (
        <div className="flex flex-col h-screen">
          <header className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <div>
              {userData?.isPremium ? (
                <Badge variant="premium">プレミアムプラン</Badge>
              ) : (
                <Badge variant="secondary">フリープラン</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {!userData?.isPremium && (
                <Button asChild size="sm">
                  <Link href="/pricing">プレミアムにアップグレード</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">設定</Link>
              </Button>
              <p>{user.email}</p>
            </div>
          </header>
          <div className="flex-1 min-h-0">
            <ChartTradeTrainer />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold mb-4">ChartTrade Trainerへようこそ</h1>
          <p className="mb-8">ログインまたは新規登録して、トレーディングの練習を始めましょう。</p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">新規登録</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
