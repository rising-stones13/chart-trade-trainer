'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import DashboardLayout from '@/components/dashboard-layout'; // Import the new layout

export default function SettingsPage() {
  const { user, userData, loading, logOut, deleteAccount } = useAuth();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (isCanceling && userData && !userData.isPremium) {
      toast({
        title: "プランが正常に解除されました",
        description: "画面の表示を更新します。",
      });
      router.refresh();
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
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteAccount();
      toast({
        title: "アカウントが削除されました",
        description: "ご利用ありがとうございました。",
      });
      router.push('/');
    } catch (error: any) {
      // ... (error handling as before)
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCancelSubscription = async () => {
    // ... (function logic as before)
  };

  if (loading || !user) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </main>
    );
  }

  // Wrap the page content with DashboardLayout
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">設定</h1>

        <div className="grid gap-6">
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

          {/* NOTE: Logout is now in the user menu, so this card can be removed if desired for minimalism */}
          {/* For now, we will keep it for clarity */}
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
      </div>
    </DashboardLayout>
  );
}
