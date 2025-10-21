'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { meApi } from '@/app/lib/authApi';
import { connectionStatusApi } from '@/app/lib/spapiApi'; // ★追加

type Me = { id: number; username: string; email: string; first_name?: string };

export default function HomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [isPC, setIsPC] = useState(false);

  // ★追加：SP-APIトークン（登録状況）
  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // 認証チェック
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await meApi();
        if (!cancel) { setMe(data); setAuthChecked(true); }
      } catch {
        if (!cancel) router.replace('/login');
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  // 画面幅（PC判定）
  useEffect(() => {
    if (!authChecked) return;
    const update = () => setIsPC(typeof window !== 'undefined' && window.innerWidth >= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [authChecked]);

  // ★追加：リフレッシュトークンの登録状況を確認 → 未登録なら登録画面へ
  useEffect(() => {
    if (!authChecked) return;
    let cancel = false;
    (async () => {
      try {
        const { has_refresh_token } = await connectionStatusApi();
        if (cancel) return;
        setHasToken(has_refresh_token);
        setTokenChecked(true);
        if (!has_refresh_token) {
          // 登録画面へ。完了後に戻したい場合は ?next= を付与
          router.replace('/connect-amazon?next=/products');
        }
      } catch {
        if (!cancel) {
          setHasToken(false);
          setTokenChecked(true);
          router.replace('/connect-amazon?next=/products');
        }
      }
    })();
    return () => { cancel = true; };
  }, [authChecked, router]);

  // PCはメニューではなく /products へ（ただし登録済みの場合のみ）
  useEffect(() => {
    if (authChecked && tokenChecked && hasToken && isPC) {
      router.replace('/products');
    }
  }, [authChecked, tokenChecked, hasToken, isPC, router]);

  // フリッカー抑止：チェック完了までは描画しない
  if (!authChecked || !tokenChecked || isPC) return null;

  const displayName = me?.first_name?.trim() || me?.username || 'ユーザー';

  return (
    <div className="min-h-screen bg-white text-[#3c4043] font-sans">
      <Header />
      <main className="py-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm text-[#5f6368] mb-2">ようこそ、{displayName} さん</p>
          <h2 className="text-2xl font-semibold text-[#202124] mb-10">機能メニュー</h2>

          {/* ★未登録でもここに到達することは基本ないが、万一API失敗時の保険としてボタンを出しておく */}
          {!hasToken && (
            <div className="mb-6">
              <Link href="/connect-amazon?next=/products" className="underline text-[#1a73e8]">
                まずはAmazonと連携（リフレッシュトークン登録）
              </Link>
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            <Link href="/products" className="w-[90%]">
              <button className="w-full py-4 bg-[#1a73e8] text-white text-lg rounded-2xl shadow-md hover:bg-[#1967d2] transition-colors">
                商品一覧を見る
              </button>
            </Link>
            <Link href="/purchase-order" className="w-[90%]">
              <button className="w-full py-4 bg-[#1a73e8] text-white text-lg rounded-2xl shadow-md hover:bg-[#1967d2] transition-colors">
                納品候補を見る
              </button>
            </Link>
            <Link href="/bulk-export" className="w-[90%]">
              <button className="w-full py-4 bg-[#1a73e8] text-white text-lg rounded-2xl shadow-md hover:bg-[#1967d2] transition-colors">
                CSVエクスポート
              </button>
            </Link>
            <Link href="/notifications" className="w-[90%]">
              <button className="w-full py-4 bg-[#1a73e8] text-white text-lg rounded-2xl shadow-md hover:bg-[#1967d2] transition-colors">
                通知設定
              </button>
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-[#dadce0] py-6 text-center text-sm text-[#5f6368]">
        &copy; {new Date().getFullYear()} FBA在庫管理システム
      </footer>
    </div>
  );
}
