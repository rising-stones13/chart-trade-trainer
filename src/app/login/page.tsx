'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { logIn, sendPasswordReset, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await logIn(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('パスワードをリセットするにはメールアドレスを入力してください。');
      return;
    }
    try {
      await sendPasswordReset(email);
      toast({
        title: 'メールを確認してください',
        description: 'パスワードリセット用のリンクを記載したメールを送信しました。',
      });
      setIsResetting(false); // ログインフォームに戻る
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{isResetting ? 'パスワードをリセット' : 'ログイン'}</CardTitle>
          <CardDescription>
            {isResetting
              ? 'パスワードをリセットするためのリンクをメールで送信します。'
              : 'アカウントにログインするためにメールアドレスとパスワードを入力してください。'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={isResetting ? handleResetPassword : handleLogin}>
          <CardContent className="grid gap-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!isResetting && (
              <div className="grid gap-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start">
            <Button type="submit" className="w-full">
              {isResetting ? 'リセットメールを送信' : 'ログイン'}
            </Button>
            
            {!isResetting && (
              <>
                <div className="relative w-full my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      または
                    </span>
                  </div>
                </div>
                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn}>
                  Googleでログイン
                </Button>
              </>
            )}

            <div className="mt-4 text-xs text-center w-full">
              {isResetting ? (
                <button type="button" onClick={() => { setIsResetting(false); setError(null); }} className="underline">
                  ログイン画面に戻る
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => { setIsResetting(true); setError(null); }} className="underline">
                    パスワードをお忘れですか？
                  </button>
                  <p className="mt-2 text-muted-foreground">
                    アカウントをお持ちでないですか？{' '}
                    <Link href="/signup" className="underline">
                      新規登録
                    </Link>
                  </p>
                </>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
