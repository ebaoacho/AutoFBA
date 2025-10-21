// app/register/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerApi, meApi } from '@/app/lib/authApi';
import { HttpError } from '@/app/lib/http';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [password2, setPassword2] = useState('');
  const [nickname, setNickname]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await meApi();
        router.replace('/');
      } catch {
        // 未ログイン時は何もしない
      }
    })();
  }, [router]);

  const validate = () => {
    if (!email || !password || !password2 || !nickname) return 'すべての項目を入力してください。';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'メールアドレスの形式が正しくありません。';
    if (password.length < 8) return 'パスワードは8文字以上にしてください。';
    if (password !== password2) return '確認用パスワードが一致しません。';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setLoading(true);
    try {
      await registerApi({ email, password, nickname }); // ★ Django: /auth/register/
      router.replace('/home');
    } catch (error) {
      let msg = '登録に失敗しました。';
      if (error instanceof HttpError) {
        // サーバーからの詳細エラーメッセージ
        if (
          typeof error.data === 'object' &&
          error.data !== null
        ) {
          const data = error.data as Record<string, unknown>;
          if (Array.isArray(data.email) && typeof data.email[0] === 'string') {
            msg = data.email[0];
          } else if (typeof data.detail === 'string') {
            msg = data.detail;
          } else {
            msg = error.message;
          }
        }
      } else if (error instanceof Error) {
        msg = error.message;
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleRegister}
        className="bg-white shadow-md rounded-2xl px-8 pt-8 pb-10 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">アカウント作成</h1>
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">ニックネーム</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mb-4 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="例）山田太郎"
        />

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
          className="mb-4 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="8文字以上"
        />

        <label className="block text-sm font-medium mb-1">パスワード（確認）</label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="mb-6 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="もう一度入力"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? '登録中…' : '登録する'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            ログイン
          </a>
        </p>
      </form>
    </div>
  );
}
