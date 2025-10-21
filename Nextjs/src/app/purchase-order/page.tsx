'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SKUConfig {
  sku: string;
  product_name: string;
  current_inventory: number;
  daily_sales_estimate: number;
  secure_days: number;
  delivery_days: number;
  sales_price?: number;
  asin?: string;
  updated_at?: string;
  data_month?: string;
}

export default function PurchaseOrderPage() {
  const [configs, setConfigs] = useState<SKUConfig[]>([]);

  useEffect(() => {
    fetch('https://autofba.net/sku-data/all-sku-configs/')
      .then((res) => res.json())
      .then((data) => {
        if (data?.results) {
          setConfigs(data.results);
        }
      })
      .catch((err) => console.error('在庫データの取得エラー:', err));
  }, []);

  const reorderItems = configs
    .map((config) => {
      const {
        sku,
        product_name,
        current_inventory,
        daily_sales_estimate,
        secure_days,
        delivery_days,
        data_month,
      } = config;
      const avg = daily_sales_estimate || fallbackEstimate(config.sales_price);
      const alert = Math.round(avg * secure_days);
      const target = Math.round(avg * delivery_days);
      const recommend = Math.max(target - current_inventory, 0);
      return {
        sku,
        product_name,
        data_month,
        current_inventory,
        alert,
        recommend,
      };
    })
    .filter((item) => item.current_inventory < item.alert && item.recommend > 0);

    function fallbackEstimate(price?: number): number {
      if (!price || price <= 0) return 1; // デフォルトロジック
      return Math.max(Math.floor(price / 1000), 1);
    }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#3c4043] font-sans">
      <main className="py-12 px-4 md:px-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-center mb-8 text-[#202124]">
          納品候補商品（在庫が納品点を下回っている商品）
        </h1>

        <div className="max-w-6xl mx-auto overflow-x-auto">
          <table className="min-w-full bg-white rounded-md shadow-sm text-sm">
            <thead className="bg-[#f1f3f4] text-left font-medium text-[#5f6368]">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">商品名</th>
                <th className="px-4 py-2">現在在庫</th>
                <th className="px-4 py-2">納品点</th>
                <th className="px-4 py-2">納品推奨数</th>
              </tr>
            </thead>
            <tbody>
              {reorderItems.map((item) => (
                <tr key={item.sku}>
                  <td className="px-4 py-2 font-mono">{item.sku}</td>
                  <td className="px-4 py-2 text-blue-700">
                    <Link href={`/products/${item.sku}`}>{item.product_name}</Link>
                  </td>
                  <td className="px-4 py-2">{item.current_inventory}</td>
                  <td className="px-4 py-2">{item.alert}</td>
                  <td className="px-4 py-2 font-bold text-blue-600">{item.recommend}</td>
                </tr>
              ))}
              {reorderItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-6">
                    現在、納品点を下回る商品はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
