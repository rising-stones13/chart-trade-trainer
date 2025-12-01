'use client';

import ChartTradeTrainer from '@/components/chart-trade-trainer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <header className="flex justify-between items-center p-4 border-b flex-shrink-0 h-16">
            <div>
              {userData?.isPremium ? (
                <Badge variant="premium">プレミアムプラン</Badge>
              ) : (
                <Badge variant="secondary">フリープラン</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 flex-nowrap min-w-0">
              {!userData?.isPremium && (
                <Button asChild size="sm">
                  <Link href="/pricing">プレミアムにアップグレード</Link>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                      <AvatarFallback>
                        {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">ログイン中</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">設定</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logOut}>
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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