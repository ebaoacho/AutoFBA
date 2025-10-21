// app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginApi, meApi } from '@/app/lib/authApi';
import { HttpError } from '@/app/lib/http';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  // 既にログインしていたら /home へ
  useEffect(() => {
    (async () => {
      try {
        await meApi();
        router.replace('/home');
      } catch {
        // 未ログインなら何もしない
      }
    })();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) {
      setErr('メールアドレスとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await loginApi({ email, password }); // ★ Django: /auth/login/
      router.replace('/home');
    } catch (error) {
      let message = 'ログインに失敗しました。';
      if (error instanceof HttpError) {
        // サーバーからのエラーメッセージ
        if (
          typeof error.data === 'object' &&
          error.data !== null &&
          'detail' in error.data &&
          typeof (error.data as { detail?: unknown }).detail === 'string'
        ) {
          message = (error.data as { detail: string }).detail;
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-md rounded-2xl px-8 pt-8 pb-10 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">ログイン</h1>

        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="you@example.com"
        />

        <label className="block text-sm font-medium mb-1">パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? 'ログイン中…' : 'ログイン'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            アカウント作成
          </a>
        </p>
      </form>
    </div>
  );
}
