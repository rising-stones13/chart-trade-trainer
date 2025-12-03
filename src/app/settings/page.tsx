'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, userData, loading, logOut, deleteAccount } = useAuth();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  // DB更新を待機中であることを示すstate
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // DB更新を監視し、完了したらリフレッシュするuseEffect
  useEffect(() => {
    // isCancelingがtrue（更新待機中）で、かつuserData.isPremiumがfalseに変わったら実行
    if (isCanceling && userData && !userData.isPremium) {
      toast({
        title: "プランが正常に解除されました",
        description: "画面の表示を更新します。",
      });
      // 確実なDB更新を検知したので、リフレッシュを実行
      router.refresh();
      // 待機状態を解除
      setIsCanceling(false);
    }
  }, [userData, isCanceling, router, toast]);

  const handleDeleteAccount = async () => {
    if (userData?.isPremium) {
      toast({
        variant: "destructive",
        title: "アカウントを削除できません",
        description: "プレミアムプランを解除してからアカウントを削除してください。",
      });
      setIsDeleteDialogOpen(false); // AlertDialogを閉じる
      return;
    }

    try {
      await deleteAccount();
      toast({
        title: "アカウントが削除されました",
        description: "ご利用ありがとうございました。",
      });
      router.push('/'); // アカウント削除後はトップページへリダイレクト
    } catch (error: any) {
      if (error.message === "auth/requires-recent-login") {
        toast({
          variant: "destructive",
          title: "エラー: 再認証が必要です",
          description: "セキュリティのため、アカウントを削除する前に再度ログインしてください。",
        });
        await logOut(); // セキュリティのためログアウトし、再ログインを促す
        router.push('/login');
      } else {
        toast({
          variant: "destructive",
          title: "アカウント削除に失敗しました",
          description: error.message || "予期せぬエラーが発生しました。",
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/'); // Redirect to home page after logout
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "ログアウトに失敗しました",
        description: error.message || "予期せぬエラーが発生しました。",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "エラー", description: "ログインが必要です。" });
      return;
    }

    // 待機状態を開始
    setIsCanceling(true);
    toast({
      title: "サブスクリプションの解除処理を開始しました...",
      description: "データベースの更新を待っています。",
    });

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "サブスクリプションの解除リクエストに失敗しました。");
      }
      // 成功した場合、ここでは何もしない。useEffectが後続処理を行う。

    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      toast({
        variant: "destructive",
        title: "サブスクリプション解除に失敗しました",
        description: error.message || "予期せぬエラーが発生しました。",
      });
      // エラーが発生したので待機状態を解除
      setIsCanceling(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-background text-foreground">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> メイン画面に戻る
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold mb-8">設定</h1>

      <div className="grid gap-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>アカウント情報</CardTitle>
            <CardDescription>登録されているアカウント情報を確認できます。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">メールアドレス:</p>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">現在のプラン:</p>
              {userData?.isPremium ? (
                <Badge variant="premium" className="text-lg px-3 py-1">プレミアムプラン</Badge>
              ) : (
                <Badge variant="secondary" className="text-lg px-3 py-1">フリープラン</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {userData?.isPremium && (
          <Card>
            <CardHeader>
              <CardTitle>プレミアムプラン管理</CardTitle>
              <CardDescription>
                現在のプレミアムプランの状況を確認し、必要に応じて解除できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">現在の契約期間終了日:</p>
                <p className="text-lg">
                  {userData.currentPeriodEnd ? new Date(userData.currentPeriodEnd * 1000).toLocaleDateString() : '不明'}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={isCanceling}>
                    {isCanceling ? '解除処理中...' : 'プレミアムプランを解除する'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>本当にプレミアムプランを解除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      この操作を行うと、サブスクリプションは即座にキャンセルされ、プレミアム機能が利用できなくなります。この操作は元に戻せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription} disabled={isCanceling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      解除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>ログアウト</CardTitle>
            <CardDescription>
              現在のアカウントからログアウトします。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="outline">ログアウト</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アカウント削除</CardTitle>
            <CardDescription>
              この操作は元に戻せません。アカウントに関連するすべてのデータが完全に削除されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">アカウントを削除する</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当にアカウントを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消せません。すべてのアカウントデータが完全に削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    削除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
