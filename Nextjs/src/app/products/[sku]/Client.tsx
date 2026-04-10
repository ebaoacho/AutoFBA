'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/app/lib/http';
import { fetchSkuConfigsWithFBAInventory } from '@/app/lib/fbaData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// -------------------- types --------------------
interface ProductData {
  出品者SKU: string;
  商品名: string;
  ASIN: string;
  販売価格: number;
  在庫数: number;
  コンディション: string;
  商品タイプ: string;
  データ年月: string;
}

interface SKUConfig {
  sku: string;
  data_month: string;
  product_name: string;
  jan_code: string;
  supplier: string;
  secure_days: number;
  delivery_days: number;
  purchase_price: number;
  sales_price: number;
  amazon_fee?: number;
  shipping_fee?: number;
  storage_fee?: number;
  profit_margin?: number;
  minimum_profit_margin?: number;
  is_target: boolean;
  current_inventory: number;
  asin?: string;
  last_sales_sync?: string;
  daily_sales_estimate: number;
  created_at?: string;
  updated_at?: string;
  calculated_profit_rate?: number;
  calculated_daily_profit?: number;
  calculated_inventory_days?: number;
  alert_triggered?: boolean;
  delivery_point?: number;
}

interface ChartData {
  データ年月: string;
  販売価格: number;
  在庫数: number;
}

interface SalesAnalysis {
  dailyAverage: number;
  deliveryPoint: number;
  recommendedDeliveryQuantity: number;
  trendColor: 'blue' | 'yellow' | 'normal';
  past90DaysAverage: number;
  recent30DaysAverage: number;
  monthlySales: number;
}

type HistoryItem = {
  sku: string;
  product_name?: string;
  asin?: string;
  sales_price?: number | string;
  current_inventory?: number;
  data_month: string;
};

type HistoryResponse = {
  history: HistoryItem[];
};

type Analytics = {
  daily_sales_estimate: number;
  inventory_days: number;
  price_trend: 'increasing' | 'decreasing' | 'stable' | null;
  inventory_trend: 'increasing' | 'decreasing' | 'stable' | null;
  history_count: number;
  latest_data_month: string;
  alert_triggered: boolean;
  recommended_delivery_quantity?: number;
};

type NumericLike = number | string | null | undefined;

// -------------------- props --------------------
export type ProductDetailClientProps = { sku: string };

// -------------------- component --------------------
export default function Client({ sku }: ProductDetailClientProps) {
  const [historyData, setHistoryData] = useState<ProductData[]>([]);
  const [currentConfig, setCurrentConfig] = useState<SKUConfig | null>(null);
  const [analyticsData, setAnalyticsData] = useState<Analytics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [secureDays, setSecureDays] = useState(30);
  const [deliveryDays, setDeliveryDays] = useState(45);
  const [janCode, setJanCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const dataLoadedRef = useRef(false);

  const safeToFixed = (value: NumericLike, digits: number = 1): string => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : '0';
  };
  const safeToLocaleString = (value: NumericLike): string => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString() : '0';
  };

  // 履歴データ
  const fetchHistoryData = useCallback(async (config: SKUConfig | null) => {
    try {
      const response = await apiFetch<HistoryResponse>(`/sku-data/sku-history/${sku}/`);
      const converted: ProductData[] = response.history.map((item) => ({
        出品者SKU: item.sku,
        商品名: config?.product_name || item.product_name || `商品-${item.sku}`,
        ASIN: item.asin || config?.asin || '',
        販売価格: item.sales_price ? Number(item.sales_price) : 0,
        在庫数: item.current_inventory ?? 0,
        コンディション: '新品',
        商品タイプ: 'PRODUCT',
        データ年月: item.data_month,
      }));
      setHistoryData(converted);

      const sorted = [...converted].sort((a, b) => a.データ年月.localeCompare(b.データ年月));
      setChartData(sorted.map((i) => ({ データ年月: i.データ年月, 販売価格: i.販売価格, 在庫数: i.在庫数 })));
      return true;
    } catch (e) {
      console.error('履歴データ取得エラー:', e);
      return false;
    }
  }, [sku]);

  // 設定
  const fetchConfig = useCallback(async () => {
    try {
      const configs = await fetchSkuConfigsWithFBAInventory<SKUConfig>();
      const data = configs.find((item) => item.sku === sku) ?? null;
      if (!data) return null;
      setCurrentConfig(data);
      setSecureDays(Number(data.secure_days) || 30);
      setDeliveryDays(Number(data.delivery_days) || 45);
      setJanCode(data.jan_code || '');
      setSupplier(data.supplier || '');
      setPurchasePrice(Number(data.purchase_price) || 0);
      return data;
    } catch (e) {
      console.error('SKU設定取得エラー:', e);
      return null;
    }
  }, [sku]);

  // 分析
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const data = await apiFetch<Analytics>(`/sku-data/sku-analytics/${sku}/`);
      setAnalyticsData(data);
      return true;
    } catch (e) {
      console.error('分析データ取得エラー:', e);
      return false;
    }
  }, [sku]);

  // CSV フォールバック
  const loadFromCSV = useCallback(async (): Promise<boolean> => {
    try {
      const Papa = (await import('papaparse')) as typeof import('papaparse');
      const response = await fetch('/data/items.csv');
      const csv = await response.text();

      const { data } = Papa.parse<ProductData>(csv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: (field: string | number) => field !== 'データ年月',
      });

      const skuData = data.filter((d) => d.出品者SKU === sku);
      if (skuData.length === 0) return false;

      setHistoryData(skuData);

      const latestData = [...skuData].sort((a, b) => b.データ年月.localeCompare(a.データ年月))[0];
      const mockConfig: SKUConfig = {
        sku,
        data_month: latestData.データ年月,
        product_name: latestData.商品名,
        jan_code: '',
        supplier: '',
        secure_days: 30,
        delivery_days: 45,
        purchase_price: 0,
        sales_price: latestData.販売価格,
        is_target: false,
        current_inventory: latestData.在庫数,
        asin: latestData.ASIN,
        daily_sales_estimate: 1.0,
      };
      setCurrentConfig(mockConfig);

      const sorted = [...skuData].sort((a, b) => a.データ年月.localeCompare(b.データ年月));
      setChartData(sorted.map((i) => ({ データ年月: i.データ年月, 販売価格: i.販売価格, 在庫数: i.在庫数 })));
      return true;
    } catch (e) {
      console.error('CSV読み込みエラー:', e);
      return false;
    }
  }, [sku]);

  // 初回ロード
  useEffect(() => {
    if (!sku || dataLoadedRef.current) return;

    const load = async () => {
      setLoading(true);
      dataLoadedRef.current = true;

      const config = await fetchConfig();
      const historyLoaded = await fetchHistoryData(config);
      await fetchAnalyticsData();

      if (!config && !historyLoaded) {
        const ok = await loadFromCSV();
        if (!ok) return notFound();
      }
      setLoading(false);
    };

    void load();
  }, [sku, fetchConfig, fetchHistoryData, fetchAnalyticsData, loadFromCSV]);

  // 分析
  const analyzeSales = (): SalesAnalysis => {
    if (!currentConfig || historyData.length === 0) {
      return { dailyAverage: 1, deliveryPoint: 30, recommendedDeliveryQuantity: 0, trendColor: 'normal', past90DaysAverage: 0, recent30DaysAverage: 0, monthlySales: 30 };
    }
    const monthlySales = Number(currentConfig.daily_sales_estimate) * 30 || 30;
    const dailyAverage = monthlySales / 30;

    const secureDaysValue = Number(currentConfig.secure_days) || 30;
    const deliveryDaysValue = Number(currentConfig.delivery_days) || 45;
    const currentStock = Number(currentConfig.current_inventory) || 0;

    const deliveryPoint = Math.round(dailyAverage * secureDaysValue);
    const requiredStock = Math.round(dailyAverage * deliveryDaysValue);
    const recommendedDeliveryQuantity = Math.max(0, requiredStock - currentStock);

    let trendColor: 'blue' | 'yellow' | 'normal' = 'normal';
    let past90DaysAverage = dailyAverage;
    let recent30DaysAverage = dailyAverage;

    if (historyData.length > 3) {
      const sorted = [...historyData].sort((a, b) => a.データ年月.localeCompare(b.データ年月));
      const recent = sorted.slice(-2);
      const older = sorted.slice(-4, -2);
      if (recent.length >= 2 && older.length >= 2) {
        const recentDec = Math.abs(recent[1].在庫数 - recent[0].在庫数);
        const olderDec = Math.abs(older[1].在庫数 - older[0].在庫数);
        recent30DaysAverage = recentDec / 30;
        past90DaysAverage = olderDec / 30;

        if (recent30DaysAverage > past90DaysAverage * 1.1) trendColor = 'blue';
        else if (recent30DaysAverage < past90DaysAverage * 0.9) trendColor = 'yellow';
      }
    }

    return {
      dailyAverage: Number(dailyAverage.toFixed(1)),
      deliveryPoint,
      recommendedDeliveryQuantity,
      trendColor,
      past90DaysAverage: Number(past90DaysAverage.toFixed(1)),
      recent30DaysAverage: Number(recent30DaysAverage.toFixed(1)),
      monthlySales,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const req = {
        sku,
        data_month: currentConfig?.data_month || '',
        product_name: currentConfig?.product_name || '',
        jan_code: janCode || currentConfig?.jan_code || '',
        supplier: supplier || currentConfig?.supplier || '',
        secure_days: Number(secureDays) || Number(currentConfig?.secure_days) || 30,
        delivery_days: Number(deliveryDays) || Number(currentConfig?.delivery_days) || 45,
        purchase_price: purchasePrice || Number(currentConfig?.purchase_price) || 0,
        sales_price: Number(currentConfig?.sales_price) || 0,
        amazon_fee: Number(currentConfig?.amazon_fee) || 0,
        shipping_fee: Number(currentConfig?.shipping_fee) || 0,
        storage_fee: Number(currentConfig?.storage_fee) || 0,
        current_inventory: Number(currentConfig?.current_inventory) || 0,
        asin: currentConfig?.asin || '',
        daily_sales_estimate: Number(currentConfig?.daily_sales_estimate) || 1.0,
        is_target: currentConfig?.is_target || false,
      };

      const updated = await apiFetch<SKUConfig>(`/sku-data/sku-config/${sku}/`, {
        method: 'PUT',
        body: JSON.stringify(req),
      });

        setCurrentConfig(updated);
        await fetchAnalyticsData();
        alert('設定を保存しました');
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">読み込み中...</div>
          <div className="text-sm text-gray-500 mt-2">データベースからSKU情報を取得中...</div>
        </div>
      </div>
    );
  }

  if (!currentConfig) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">商品が見つかりません</div>
          <div className="text-sm text-gray-500 mt-2">SKU: {sku}</div>
        </div>
      </div>
    );
  }

  const analysis = analyzeSales();
  const profit = Number(currentConfig.sales_price || 0) - Number(currentConfig.purchase_price || purchasePrice);
  const salesPrice = Number(currentConfig.sales_price) || 0;
  const margin =
    (currentConfig.purchase_price || purchasePrice) > 0 && salesPrice > 0
      ? ((profit / salesPrice) * 100).toFixed(1)
      : '未計算';
  const isLowStock = Number(currentConfig.current_inventory || 0) < Number(analysis.deliveryPoint);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#3c4043] font-sans">
      <main className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold text-[#1a73e8]">
                {currentConfig.product_name || `商品-${sku}`}
              </h1>
              <div className="flex gap-2">
                {isLowStock && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    🚨 要納品
                  </span>
                )}
                {analysis.trendColor === 'blue' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    📈 販売増加傾向
                  </span>
                )}
                {analysis.trendColor === 'yellow' && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    📉 販売減少傾向
                  </span>
                )}
              </div>
            </div>

            {/* 価格・在庫推移グラフ */}
            {chartData.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4 text-gray-700">価格・在庫推移</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="データ年月" />
                      <YAxis yAxisId="price" orientation="left" />
                      <YAxis yAxisId="stock" orientation="right" />
                      <Tooltip
                        formatter={(value: string | number, name: string) => [
                          typeof value === 'number' ? value.toLocaleString() : value,
                          name === '販売価格' ? '販売価格 (円)' : '在庫数 (個)',
                        ]}
                      />
                      <Line 
                        yAxisId="price"
                        type="monotone" 
                        dataKey="販売価格" 
                        stroke="#1a73e8" 
                        strokeWidth={2}
                        name="販売価格"
                      />
                      <Line 
                        yAxisId="stock"
                        type="monotone" 
                        dataKey="在庫数" 
                        stroke="#4ecdc4" 
                        strokeWidth={2}
                        name="在庫数"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <h2 className="text-lg font-medium mb-4 text-gray-700">基本情報</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">SKU</dt>
                    <dd className="text-[#202124] font-mono text-xs">{currentConfig.sku}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">ASIN</dt>
                    <dd className="text-[#202124] font-mono text-xs">{currentConfig.asin || '未設定'}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">データ年月</dt>
                    <dd className="text-[#202124]">{currentConfig.data_month}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">現在在庫</dt>
                    <dd className={`text-[#202124] ${isLowStock ? 'text-red-600 font-bold' : ''}`}>
                      {safeToLocaleString(currentConfig.current_inventory || 0)} 個
                    </dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">販売価格</dt>
                    <dd className="text-[#202124]">¥{safeToLocaleString(currentConfig.sales_price || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#5f6368]">最終更新</dt>
                    <dd className="text-[#202124] text-xs">
                      {currentConfig.updated_at ? new Date(currentConfig.updated_at).toLocaleDateString('ja-JP') : '未更新'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-4 text-gray-700">納品アラート情報</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">月間販売数</dt>
                    <dd className="text-[#202124]">{safeToLocaleString(analysis.monthlySales)} 個/月</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">1日平均販売数</dt>
                    <dd className="text-[#202124]">{safeToFixed(analysis.dailyAverage, 1)} 個/日</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">在庫確保日数</dt>
                    <dd className="text-[#202124]">{currentConfig.secure_days} 日</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">納品確保日数</dt>
                    <dd className="text-[#202124]">{currentConfig.delivery_days} 日</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">納品点</dt>
                    <dd className="text-[#202124] font-bold">{safeToLocaleString(analysis.deliveryPoint)} 個</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">必要在庫数</dt>
                    <dd className="text-[#202124]">{safeToLocaleString(Math.round(Number(analysis.dailyAverage) * Number(currentConfig.delivery_days || 45)))} 個</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">納品推奨数</dt>
                    <dd className="text-[#202124] font-bold text-blue-600">{safeToLocaleString(analysis.recommendedDeliveryQuantity)} 個</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">アラート状態</dt>
                    <dd className={`text-[#202124] font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                      {isLowStock ? '🚨 要納品' : '✅ 正常'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#5f6368]">在庫日数</dt>
                    <dd className="text-[#202124]">
                      {Number(analysis.dailyAverage) > 0 ? 
                        Math.round(Number(currentConfig.current_inventory || 0) / Number(analysis.dailyAverage)) : 0} 日分
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-4 text-gray-700">利益情報</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">仕入価格</dt>
                    <dd className="text-[#202124]">¥{safeToLocaleString(currentConfig.purchase_price || purchasePrice)}</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">利益額</dt>
                    <dd className={`text-[#202124] ${profit > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ¥{safeToLocaleString(profit)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368] font-medium">利益率</dt>
                    <dd className={`font-semibold ${profit > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {margin}%
                    </dd>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                    <dt className="text-[#5f6368]">予想日次利益</dt>
                    <dd className="text-[#202124]">
                      {profit > 0 ? `¥${safeToLocaleString(profit * Number(analysis.dailyAverage))}` : '¥0'}
                    </dd>
                  </div>
                  {currentConfig.amazon_fee && Number(currentConfig.amazon_fee) > 0 && (
                    <div className="flex justify-between border-b pb-2 border-[#e0e0e0]">
                      <dt className="text-[#5f6368]">Amazon手数料</dt>
                      <dd className="text-[#202124]">¥{safeToLocaleString(currentConfig.amazon_fee)}</dd>
                    </div>
                  )}
                  {currentConfig.shipping_fee && Number(currentConfig.shipping_fee) > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#5f6368]">送料</dt>
                      <dd className="text-[#202124]">¥{safeToLocaleString(currentConfig.shipping_fee)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* アラート詳細 */}
            {isLowStock && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-medium text-red-800 mb-2">🚨 納品アラート発動中</h3>
                <div className="text-sm text-red-700 space-y-1">
                  <div>現在在庫: {safeToLocaleString(currentConfig.current_inventory)}個 ＜ 納品点: {safeToLocaleString(analysis.deliveryPoint)}個</div>
                  <div>納品推奨数: {safeToLocaleString(analysis.recommendedDeliveryQuantity)}個を至急発注してください</div>
                  <div>
                    このまま放置すると約{Math.round(Number(currentConfig.current_inventory || 0) / Math.max(Number(analysis.dailyAverage), 0.1))}日で在庫切れの可能性
                  </div>
                </div>
              </div>
            )}

            {/* 販売トレンド情報 */}
            {analysis.trendColor !== 'normal' && (
              <div className={`mb-8 p-4 ${
                analysis.trendColor === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
              } border rounded-lg`}>
                <h3 className={`text-lg font-medium ${
                  analysis.trendColor === 'blue' ? 'text-blue-800' : 'text-yellow-800'
                } mb-2`}>
                  {analysis.trendColor === 'blue' ? '📈 販売増加傾向' : '📉 販売減少傾向'}
                </h3>
                <div className={`text-sm ${
                  analysis.trendColor === 'blue' ? 'text-blue-700' : 'text-yellow-700'
                } space-y-1`}>
                  <div>過去90日平均: {safeToFixed(analysis.past90DaysAverage, 1)} 個/日</div>
                  <div>直近30日平均: {safeToFixed(analysis.recent30DaysAverage, 1)} 個/日</div>
                  <div>
                    {analysis.trendColor === 'blue' 
                      ? '販売数が増加傾向にあります。在庫切れに注意してください。' 
                      : '販売数が減少傾向にあります。在庫過多に注意してください。'}
                  </div>
                </div>
              </div>
            )}

            {/* 設定入力フォーム */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-medium mb-4 text-gray-700">設定</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">JANコード</label>
                    <input
                      type="text"
                      value={janCode}
                      onChange={(e) => setJanCode(e.target.value)}
                      placeholder="例: 4901234567890"
                      maxLength={13}
                      className="border border-gray-300 px-4 py-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">仕入先</label>
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="例: 株式会社サンプル"
                      maxLength={255}
                      className="border border-gray-300 px-4 py-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">仕入価格（円）</label>
                    <input
                      type="number"
                      min="0"
                      max="99999999"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="border border-gray-300 px-4 py-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">在庫確保日数（納品点算出用）</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={secureDays}
                      onChange={(e) => setSecureDays(Number(e.target.value))}
                      className="border border-gray-300 px-4 py-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">納品点 = 1日平均販売数 × 在庫確保日数</p>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">納品確保日数（納品推奨数算出用）</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(Number(e.target.value))}
                      className="border border-gray-300 px-4 py-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">納品推奨数 = (1日平均販売数 × 納品確保日数) - 現在庫数</p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#1a73e8] text-white px-6 py-3 rounded hover:bg-[#1967d2] disabled:opacity-50 w-full mt-4 font-medium"
                  >
                    {saving ? '保存中...' : '設定を保存'}
                  </button>
                </div>
              </div>
            </div>

            {/* 履歴データ表示 */}
            {historyData.length > 1 && (
              <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-medium mb-4 text-gray-700">価格・在庫履歴データ</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">データ年月</th>
                        <th className="px-4 py-2 text-right">販売価格</th>
                        <th className="px-4 py-2 text-right">在庫数</th>
                        <th className="px-4 py-2 text-right">価格変動</th>
                        <th className="px-4 py-2 text-right">在庫変動</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData
                        .sort((a, b) => b.データ年月.localeCompare(a.データ年月))
                        .map((data, index, array) => {
                          const prevData = array[index + 1];
                          const priceChange = prevData ? Number(data.販売価格) - Number(prevData.販売価格) : 0;
                          const stockChange = prevData ? Number(data.在庫数) - Number(prevData.在庫数) : 0;
                          
                          return (
                            <tr key={`${data.データ年月}-${index}`} className="border-t">
                              <td className="px-4 py-2 font-medium">{data.データ年月}</td>
                              <td className="px-4 py-2 text-right">¥{safeToLocaleString(data.販売価格)}</td>
                              <td className="px-4 py-2 text-right">{safeToLocaleString(data.在庫数)} 個</td>
                              <td className="px-4 py-2 text-right">
                                {index === array.length - 1 ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <span className={`${
                                    priceChange > 0 ? 'text-green-600' : 
                                    priceChange < 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {priceChange > 0 ? '+' : ''}¥{safeToLocaleString(priceChange)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {index === array.length - 1 ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <span className={`${
                                    stockChange > 0 ? 'text-blue-600' : 
                                    stockChange < 0 ? 'text-orange-600' : 'text-gray-600'
                                  }`}>
                                    {stockChange > 0 ? '+' : ''}{safeToLocaleString(stockChange)} 個
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 分析データ表示（APIからのデータがある場合） */}
            {analyticsData && (
              <div className="border-t pt-6 mt-6">
                <h2 className="text-lg font-medium mb-4 text-gray-700">詳細分析データ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium mb-3">販売分析</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt>月間販売推定:</dt>
                        <dd>{safeToFixed(analyticsData.daily_sales_estimate * 30)} 個/月</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>日次販売推定:</dt>
                        <dd>{safeToFixed(analyticsData.daily_sales_estimate)} 個/日</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>在庫日数:</dt>
                        <dd>{safeToFixed(analyticsData.inventory_days, 1)} 日分</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>価格トレンド:</dt>
                        <dd>
                          <span className={`px-2 py-1 rounded text-xs ${
                            analyticsData.price_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                            analyticsData.price_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {analyticsData.price_trend === 'increasing' ? '📈 上昇' :
                             analyticsData.price_trend === 'decreasing' ? '📉 下降' :
                             analyticsData.price_trend === 'stable' ? '➡️ 安定' : '❓ 不明'}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>在庫トレンド:</dt>
                        <dd>
                          <span className={`px-2 py-1 rounded text-xs ${
                            analyticsData.inventory_trend === 'increasing' ? 'bg-blue-100 text-blue-800' :
                            analyticsData.inventory_trend === 'decreasing' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {analyticsData.inventory_trend === 'increasing' ? '📈 増加' :
                             analyticsData.inventory_trend === 'decreasing' ? '📉 減少' :
                             analyticsData.inventory_trend === 'stable' ? '➡️ 安定' : '❓ 不明'}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-medium mb-3">アラート情報</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt>履歴件数:</dt>
                        <dd>{analyticsData.history_count} 件</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>最新データ:</dt>
                        <dd>{analyticsData.latest_data_month}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>アラート状態:</dt>
                        <dd>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            analyticsData.alert_triggered ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {analyticsData.alert_triggered ? '🚨 要納品' : '✅ 正常'}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>推奨納品数:</dt>
                        <dd className="font-bold text-blue-600">
                          {safeToLocaleString(analysis.recommendedDeliveryQuantity)} 個
                          {analyticsData.recommended_delivery_quantity !== undefined && 
                           analyticsData.recommended_delivery_quantity !== analysis.recommendedDeliveryQuantity && (
                            <span className="text-xs text-gray-500 ml-2">
                              (API: {safeToLocaleString(analyticsData.recommended_delivery_quantity)}個)
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* フッター情報 */}
            <div className="border-t pt-4 mt-6 text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <div>
                  最終更新: {currentConfig.updated_at ? 
                    new Date(currentConfig.updated_at).toLocaleString('ja-JP') : 
                    '未更新'
                  }
                </div>
                <div>
                  データソース: {historyData.length > 0 ? 'データベース' : 'CSVファイル'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
