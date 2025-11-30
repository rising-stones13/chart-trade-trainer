'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function PricingPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();

  const handlePremiumRegistration = async () => {
    if (!user) {
      toast({
        title: "ログインしてください",
        description: "プレミアム機能を利用するにはログインが必要です。",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    if (userData?.isPremium) {
      toast({
        title: "すでにプレミアムユーザーです",
        description: "すでにお客様のアカウントはプレミアムに登録されています。",
      });
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, userEmail: user.email }),
      });

      const session = await response.json();

      if (session.url) {
        router.push(session.url);
      } else {
        throw new Error('Failed to create checkout session.');
      }
    } catch (error) {
      console.error("Error during premium registration:", error);
      toast({
        title: "決済セッションの作成に失敗しました",
        description: "エラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">料金プラン</h1>
        <p className="text-muted-foreground">あなたに合ったプランをお選びください。</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card>
          <CardHeader>
            <CardTitle>フリープラン</CardTitle>
            <CardDescription>基本的な機能で始めよう</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>ローカルファイルからのチャート読み込み</li>
              <li>基本的な取引機能</li>
              <li>移動平均線の表示</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button disabled className="w-full">
              現在のプラン
            </Button>
          </CardFooter>
        </Card>
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>プレミアムプラン</CardTitle>
            <CardDescription>全ての機能で、より高度な分析を</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li>リアルタイム・API経由のデータ取得</li>
              <li>高度なテクニカル指標（RSI, MACDなど）</li>
              <li>高度な取引機能（空売りなど）</li>
              <li>取引履歴の保存と分析</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handlePremiumRegistration}>
              プレミアムに登録
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="mt-8">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
