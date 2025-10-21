'use client';

import { useRouter } from 'next/navigation';
import { logoutApi, meApi } from '@/app/lib/authApi';
import { useEffect, useState } from 'react';

type MeResponse = {
  id: number;
  email: string;
  first_name?: string | null;
  username: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = (await meApi()) as MeResponse;
        setMe(data);
      } catch {
        setErr('未ログインのため /login に移動します。');
        setTimeout(() => router.replace('/login'), 1200);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // 失敗してもログイン画面へ
    }
    router.replace('/login');
  };

  if (loading) return <div className="p-8">読み込み中...</div>;
  if (err) return <div className="p-8 text-red-600">{err}</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">アカウント</h1>
      <div className="rounded-xl border p-4 mb-6">
        <p><span className="font-semibold">ID:</span> {me?.id}</p>
        <p><span className="font-semibold">メール:</span> {me?.email}</p>
        <p><span className="font-semibold">ニックネーム:</span> {me?.first_name || '-'}</p>
        <p><span className="font-semibold">ユーザー名:</span> {me?.username}</p>
      </div>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black"
      >
        ログアウト
      </button>
    </div>
  );
}
