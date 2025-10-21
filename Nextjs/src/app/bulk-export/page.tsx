'use client';

import { useState } from 'react';

export default function BulkExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [exportFormat, setExportFormat] = useState<'simplified' | 'full'>('simplified');

  const handleExportClick = async () => {
    setIsExporting(true);
    setMessage('');

    try {
      const res = await fetch(`https://autofba.net/sku-data/export-all/?format=${exportFormat}`);
      if (!res.ok) {
        throw new Error(`サーバーエラー: ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // ⏬ ファイル名に日付を含める
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const filename = `sku_export_${exportFormat}_${y}${m}${d}.csv`;

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage('✅ データベース内容のエクスポートに成功しました');
    } catch (err: unknown) {
      console.error('エクスポート失敗:', err);
      setMessage('❌ エクスポートに失敗しました。再度お試しください');
    }

    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#3c4043] font-sans">
      <main className="py-12 px-6">
        <div className="max-w-xl md:max-w-3xl mx-auto bg-white border border-[#dadce0] rounded-lg shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 text-[#202124]">
            CSVエクスポート
          </h1>

          <div className="space-y-5 text-sm md:text-base text-left">
            <label className="block mb-2">
              エクスポート形式:
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'simplified' | 'full')}
                className="ml-2 px-2 py-1 border border-gray-300 rounded"
              >
                <option value="simplified">簡易版（出品者SKU, ASIN, 納品数等）</option>
                <option value="full">全項目（全フィールド）</option>
              </select>
            </label>

            <button
              onClick={handleExportClick}
              disabled={isExporting}
              className="bg-[#1a73e8] text-white px-6 py-3 rounded hover:bg-[#1967d2] disabled:opacity-50 w-full font-medium"
            >
              {isExporting ? 'エクスポート中...' : 'CSVをダウンロード'}
            </button>

            {message && (
              <p className={message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}>
                {message}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
