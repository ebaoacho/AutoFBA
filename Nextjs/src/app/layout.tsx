import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FBA在庫管理システム',
  description: 'ホワイトテーマの在庫管理アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-white text-[#202124]`}>
        {/* ヘッダーは常に上部に固定 */}
        <Header />

        <div className="flex">
          {/* 左：サイドバー 20% 幅、sticky */}
          <aside className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] w-1/5 border-r border-[#dadce0] bg-[#f1f3f4]">
            <Sidebar />
          </aside>

          {/* 右：メイン領域 80% */}
          <main className="w-full md:w-4/5 px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
