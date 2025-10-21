'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { meApi } from '@/app/lib/authApi';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  // 認証確認が終わったかどうか
  const [authChecked, setAuthChecked] = useState(false);
  // 画面幅がPCかどうか
  const [isPC, setIsPC] = useState(false);

  // 1) 認証チェック（/auth/me/ を叩く）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await meApi(); // Cookieで認証確認（credentials: 'include' は http.ts 側で付与）
        if (!cancelled) setAuthChecked(true);
      } catch {
        // 未ログイン → /login へ
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 2) 画面幅チェック（初期化 & リサイズ対応）
  useEffect(() => {
    if (!authChecked) return; // 認証前は実行しない（チラつき防止）

    const updateIsPC = () => {
      if (typeof window === 'undefined') return;
      setIsPC(window.innerWidth >= 768);
    };

    updateIsPC();
    window.addEventListener('resize', updateIsPC);
    return () => window.removeEventListener('resize', updateIsPC);
  }, [authChecked]);

  // 3) PCなら /products に遷移
  useEffect(() => {
    if (authChecked && isPC) {
      router.replace('/products');
    }
  }, [authChecked, isPC, router]);

  // 未ログイン or リダイレクト中は何も描画しない
  if (!authChecked) return null;
  if (isPC) return null;

  // ===== ここからスマホUI =====
  return (
    <div className="min-h-screen bg-white text-[#3c4043] font-sans">
      <main className="py-20 px-6 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-[#202124] mb-10">機能メニュー</h2>
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

      <footer className="bg-white border-t border-[#dadce0] py-6 text-center text-sm text-[#5f6368]">
        &copy; {new Date().getFullYear()} FBA在庫管理システム
      </footer>
    </div>
  );
}
