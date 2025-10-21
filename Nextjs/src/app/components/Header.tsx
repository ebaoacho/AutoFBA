'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { meApi, logoutApi } from '@/app/lib/authApi';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 認証チェック（ログイン確認）
  useEffect(() => {
    (async () => {
      try {
        await meApi();
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.error(e);
    }
    setIsLoggedIn(false);
    router.replace('/login');
  };

  // /login と /register ではログアウトボタンを非表示
  const hideLogout = pathname.startsWith('/login') || pathname.startsWith('/register');

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 border-b border-[#dadce0]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center">
        {/* 左側 */}
        <div className="flex flex-col md:flex-row md:items-center gap-1">
          <Link
            href="/"
            className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a73e8] hover:underline"
          >
            LOGEX
          </Link>
          <span className="text-sm md:ml-4 text-[#5f6368]">FBA在庫管理アプリ</span>
        </div>

        {/* 右側（ログイン中 & /login, /register 以外で表示） */}
        {isLoggedIn && !hideLogout && (
          <div className="mt-3 md:mt-0">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1967d2] transition-colors"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
