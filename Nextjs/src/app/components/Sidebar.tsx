'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  // ✅ /register ではサイドバーを表示しない
  if (pathname.startsWith('/register') || pathname.startsWith('/login')) {
    return null;
  }

  const menuItems = [
    { label: '商品一覧', href: '/products' },
    { label: '納品候補', href: '/purchase-order' },
    { label: 'CSVエクスポート', href: '/bulk-export' },
    { label: '通知設定', href: '/notifications' },
  ];

  return (
    <aside className="h-full p-6 text-sm text-[#3c4043]">
      <h2 className="text-lg font-bold text-[#1a73e8] mb-6">機能メニュー</h2>
      <nav className="space-y-3">
        {menuItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 rounded transition-colors hover:bg-[#e8eaed] ${
                active ? 'bg-[#e8eaed] font-semibold' : ''
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
