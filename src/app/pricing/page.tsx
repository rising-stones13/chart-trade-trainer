'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PricingPage() {
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
            <Button className="w-full">
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
