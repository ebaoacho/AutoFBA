'use client';

import Papa from 'papaparse';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
}

export default function ProductListPage() {
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [selectedSKU, setSelectedSKU] = useState<string>('');
  const [bulkSupplier, setBulkSupplier] = useState('');
  const [configMap, setConfigMap] = useState<Record<string, SKUConfig>>({});
  const [updatedSecureDays, setUpdatedSecureDays] = useState(30);
  const [updatedDeliveryDays, setUpdatedDeliveryDays] = useState(45);
  const [updatedJanCode, setUpdatedJanCode] = useState('');
  const [updatedSupplier, setUpdatedSupplier] = useState('');
  const [updatedPurchasePrice, setUpdatedPurchasePrice] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const updateChartData = useCallback((sku: string, data: ProductData[]) => {
    const skuData = data
      .filter((d) => d.出品者SKU === sku)
      .sort((a, b) => a.データ年月.localeCompare(b.データ年月))
      .map((d) => ({
        データ年月: d.データ年月,
        販売価格: d.販売価格,
        在庫数: d.在庫数,
      }));
    setChartData(skuData);
  }, []); // ← 依存なしでOK（setChartDataは安定）

  const initializeWithProductData = useCallback(
    (data: ProductData[], configMapping: Record<string, SKUConfig>) => {
      const firstSKU = data.find((d) => d.出品者SKU)?.出品者SKU;

      if (firstSKU) {
        setSelectedSKU(firstSKU);
        updateChartData(firstSKU, data);
        if (!isSearchMode) {
          const firstProduct = data.find((d) => d.出品者SKU === firstSKU);
          if (firstProduct) {
            setSearchTerm(`${firstSKU} - ${firstProduct.商品名}`);
          }
        }
      }

      if (Object.keys(configMapping).length > 0 && firstSKU && configMapping[firstSKU]) {
        const config = configMapping[firstSKU];
        setUpdatedSecureDays(config.secure_days ?? 30);
        setUpdatedDeliveryDays(config.delivery_days ?? 45);
        setUpdatedJanCode(config.jan_code ?? '');
        setUpdatedSupplier(config.supplier ?? '');
        setUpdatedPurchasePrice(config.purchase_price ? Number(config.purchase_price) : 0);
      }
    },
    [isSearchMode, updateChartData] // ← 依存はこれだけでOK
  );

  useEffect(() => {
    fetch('https://autofba.net/sku-data/all-sku-configs/?history=true')
      .then((res) => {
        if (!res.ok) throw new Error(`SKU configs endpoint error: ${res.status}`);
        return res.json() as Promise<SKUConfig[] | { results: SKUConfig[] }>;
      })
      .then((response) => {
        const configs = Array.isArray(response) ? response : response.results ?? [];
        const constructedData: ProductData[] = configs.map((config) => ({
          出品者SKU: config.sku,
          商品名: config.product_name || `商品-${config.sku}`,
          ASIN: config.asin || '',
          販売価格: config.sales_price ? Number(config.sales_price) : 0,
          在庫数: config.current_inventory || 0,
          コンディション: '新品',
          商品タイプ: 'PRODUCT',
          データ年月: config.data_month || new Date().toISOString().substring(0, 7),
        }));
        setProductData(constructedData);

        const configMapping: Record<string, SKUConfig> = {};
        const processedSkus = new Set<string>();
        const sortedConfigs = [...configs].sort((a, b) =>
          a.sku !== b.sku ? a.sku.localeCompare(b.sku) : (b.data_month || '').localeCompare(a.data_month || '')
        );
        sortedConfigs.forEach((config) => {
          if (!processedSkus.has(config.sku)) {
            configMapping[config.sku] = config;
            processedSkus.add(config.sku);
          }
        });

        setConfigMap(configMapping);
        initializeWithProductData(constructedData, configMapping);
      })
      .catch(async () => {
        const res = await fetch('/data/items.csv');
        const csv = await res.text();
        const { data } = Papa.parse<ProductData>(csv, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: (field) => field !== 'データ年月',
        });
        setProductData(data);
        initializeWithProductData(data, {});
      });
  }, [initializeWithProductData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedSKU && configMap[selectedSKU]) {
      const cfg = configMap[selectedSKU];
      setUpdatedSecureDays(cfg.secure_days ?? 30);
      setUpdatedDeliveryDays(cfg.delivery_days ?? 45);
      setUpdatedJanCode(cfg.jan_code ?? '');
      setUpdatedSupplier(cfg.supplier ?? '');
      setUpdatedPurchasePrice(cfg.purchase_price ? Number(cfg.purchase_price) : 0);
    }
  }, [selectedSKU, configMap]);

  const getLatestDataBySKU = (sku: string): ProductData | null => {
    const skuData = productData
      .filter((d) => d.出品者SKU === sku)
      .sort((a, b) => b.データ年月.localeCompare(a.データ年月));
    return skuData.length > 0 ? skuData[0] : null;
  };

  const analyzeSales = (sku: string): SalesAnalysis => {
    const config = configMap[sku];
    const skuData = productData
      .filter((d) => d.出品者SKU === sku)
      .sort((a, b) => a.データ年月.localeCompare(b.データ年月));

    if (!config || skuData.length === 0) {
      return {
        dailyAverage: 1,
        deliveryPoint: 30,
        recommendedDeliveryQuantity: 0,
        trendColor: 'normal',
        past90DaysAverage: 0,
        recent30DaysAverage: 0,
      };
    }

    const dailyAverage = Number(config.daily_sales_estimate) || 1;
    const secureDays = Number(config.secure_days) || 30;
    const deliveryDays = Number(config.delivery_days) || 45;
    const currentInventory = Number(config.current_inventory) || 0;

    const deliveryPoint = Math.round(dailyAverage * secureDays);
    const requiredStock = Math.round(dailyAverage * deliveryDays);
    const recommendedDeliveryQuantity = Math.max(0, requiredStock - currentInventory);

    // 販売トレンド判定
    let trendColor: 'blue' | 'yellow' | 'normal' = 'normal';
    let past90DaysAverage = dailyAverage;
    let recent30DaysAverage = dailyAverage;

    if (skuData.length > 3) {
      const sorted = [...skuData];
      const recentData = sorted.slice(-2);
      const olderData = sorted.slice(-4, -2);

      if (recentData.length === 2 && olderData.length === 2) {
        const recentStockDecrease = Math.abs(recentData[1].在庫数 - recentData[0].在庫数);
        const olderStockDecrease = Math.abs(olderData[1].在庫数 - olderData[0].在庫数);

        recent30DaysAverage = recentStockDecrease / 30;
        past90DaysAverage = olderStockDecrease / 30;

        if (recent30DaysAverage > past90DaysAverage * 1.1) {
          trendColor = 'blue';
        } else if (recent30DaysAverage < past90DaysAverage * 0.9) {
          trendColor = 'yellow';
        }
      }
    }

    return {
      dailyAverage: Number(dailyAverage.toFixed(1)),
      deliveryPoint,
      recommendedDeliveryQuantity,
      trendColor,
      past90DaysAverage: Number(past90DaysAverage.toFixed(1)),
      recent30DaysAverage: Number(recent30DaysAverage.toFixed(1)),
    };
  };

  const bulkUpdateConfig = async () => {
    const skus = Object.keys(configMap);
    const updatedConfigs: Record<string, SKUConfig> = { ...configMap };

    for (const sku of skus) {
      const original = configMap[sku];
      try {
        const res = await fetch(`https://autofba.net/sku-data/sku-config/${sku}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku,
            secure_days: updatedSecureDays,
            delivery_days: updatedDeliveryDays,
            supplier: bulkSupplier || original.supplier,
            jan_code: original.jan_code,
            purchase_price: original.purchase_price,
            product_name: original.product_name,
            sales_price: original.sales_price,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          updatedConfigs[sku] = updated;
        } else {
          updatedConfigs[sku] = {
            ...original,
            secure_days: updatedSecureDays,
            delivery_days: updatedDeliveryDays,
            supplier: bulkSupplier || original.supplier,
          };
        }
      } catch (err) {
        console.error(`${sku} の更新失敗:`, err);
      }
    }

    setConfigMap(updatedConfigs);
    alert('すべてのSKUに設定を反映しました');
  };

  const updateConfig = async (sku: string) => {
    try {
      const res = await fetch(`https://autofba.net/sku-data/sku-config/${sku}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          secure_days: updatedSecureDays,
          delivery_days: updatedDeliveryDays,
          jan_code: updatedJanCode,
          supplier: updatedSupplier,
          purchase_price: updatedPurchasePrice,
          product_name: configMap[sku]?.product_name || '',
          sales_price: configMap[sku]?.sales_price || 0,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfigMap((prev) => ({ ...prev, [sku]: data }));
        alert('設定を更新しました');
      } else {
        const currentConfig = configMap[sku];
        if (currentConfig) {
          const updatedConfig = {
            ...currentConfig,
            secure_days: updatedSecureDays,
            delivery_days: updatedDeliveryDays,
            jan_code: updatedJanCode,
            supplier: updatedSupplier,
            purchase_price: updatedPurchasePrice,
          };
          setConfigMap((prev) => ({ ...prev, [sku]: updatedConfig }));
        }
        alert('設定を更新しました（ローカル）');
      }
    } catch (err) {
      console.error('更新失敗', err);
      alert('更新に失敗しました');
    }
  };

  const handleSKUChange = (sku: string) => {
    setSelectedSKU(sku);
    updateChartData(sku, productData);
    
    if (!isSearchMode) {
      const product = latestProducts.find(p => p.出品者SKU === sku);
      if (product) {
        setSearchTerm(`${sku} - ${product.商品名}`);
      }
    }
    setIsDropdownOpen(false);
    
    const config = configMap[sku];
    if (config) {
      setUpdatedSecureDays(config.secure_days ?? 30);
      setUpdatedDeliveryDays(config.delivery_days ?? 45);
      setUpdatedJanCode(config.jan_code ?? '');
      setUpdatedSupplier(config.supplier ?? '');
      setUpdatedPurchasePrice(config.purchase_price ? Number(config.purchase_price) : 0);
    } else {
      setUpdatedSecureDays(30);
      setUpdatedDeliveryDays(45);
      setUpdatedJanCode('');
      setUpdatedSupplier('');
      setUpdatedPurchasePrice(0);
    }
  };

  const latestProducts = Array.from(
    new Set(productData.map((p) => p.出品者SKU))
  ).map((sku) => getLatestDataBySKU(sku)).filter(Boolean) as ProductData[];

  const filteredProducts = isSearchMode && searchTerm 
    ? latestProducts.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.出品者SKU.toLowerCase().includes(searchLower) ||
          product.商品名.toLowerCase().includes(searchLower) ||
          product.ASIN.toLowerCase().includes(searchLower)
        );
      })
    : latestProducts;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setIsSearchMode(true);
    setIsDropdownOpen(true);
  };

  const handleSearchFocus = () => {
    if (!isSearchMode) {
      setSearchTerm('');
      setIsSearchMode(true);
    }
    setIsDropdownOpen(true);
  };

  const handleOptionSelect = (product: ProductData) => {
    handleSKUChange(product.出品者SKU);
    setIsSearchMode(false);
    setSearchTerm(`${product.出品者SKU} - ${product.商品名}`);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      if (!isDropdownOpen) {
        if (isSearchMode && selectedSKU) {
          const selectedProduct = latestProducts.find(p => p.出品者SKU === selectedSKU);
          if (selectedProduct) {
            setSearchTerm(`${selectedSKU} - ${selectedProduct.商品名}`);
            setIsSearchMode(false);
          }
        }
      }
    }, 200);
  };

  const clearSearch = () => {
    if (selectedSKU) {
      const selectedProduct = latestProducts.find(p => p.出品者SKU === selectedSKU);
      if (selectedProduct) {
        setSearchTerm(`${selectedSKU} - ${selectedProduct.商品名}`);
      }
    } else {
      setSearchTerm('');
    }
    setIsSearchMode(false);
    setIsDropdownOpen(false);
  };

  const scrollToGraph = () => {
    graphRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#3c4043] font-sans relative">
      <main className="py-12 px-4 md:px-8">
        <div ref={graphRef} id="graph-section" className="max-w-4xl mx-auto mb-16">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">SKU別 価格・在庫推移グラフ</h2>
          <div className="mb-4">
            <label className="block mb-2 font-medium">SKU選択:</label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder={isSearchMode ? "SKU、商品名、ASINで検索..." : "クリックして検索またはSKUを選択"}
                  className="w-full border border-[#dadce0] px-4 py-2 pr-10 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {isSearchMode && searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                {!isSearchMode && (
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                  >
                    <svg className={`w-5 h-5 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {isSearchMode && searchTerm && filteredProducts.length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-center">
                      「{searchTerm}」の検索結果が見つかりません
                    </div>
                  )}
                  
                  {filteredProducts.length > 0 && (
                    <>
                      {isSearchMode && searchTerm && (
                        <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600 font-medium">
                          {filteredProducts.length}件の検索結果
                        </div>
                      )}
                      
                      {filteredProducts.map((product) => {
                        const analysis = analyzeSales(product.出品者SKU);
                        const alertTriggered = product.在庫数 < analysis.deliveryPoint;
                        
                        return (
                          <div
                            key={product.出品者SKU}
                            onClick={() => handleOptionSelect(product)}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              product.出品者SKU === selectedSKU ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            } ${alertTriggered ? 'bg-red-50 border-l-4 border-l-red-400' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium text-gray-900">
                                    {product.出品者SKU}
                                  </span>
                                  {product.出品者SKU === selectedSKU && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      ✓ 選択中
                                    </span>
                                  )}
                                  {alertTriggered && (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                      🚨 要納品
                                    </span>
                                  )}
                                  {analysis.trendColor === 'blue' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      📈 増加
                                    </span>
                                  )}
                                  {analysis.trendColor === 'yellow' && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                      📉 減少
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-1 truncate">
                                  {product.商品名}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <span>ASIN: {product.ASIN}</span>
                                  <span>在庫: {product.在庫数}個</span>
                                  <span>¥{product.販売価格?.toLocaleString()}</span>
                                  <span>納品推奨: {analysis.recommendedDeliveryQuantity}個</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  {!isSearchMode && (
                    <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
                      全{latestProducts.length}件のSKU / クリックで選択、入力で検索
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {isSearchMode ? (
                <span>
                  🔍 検索中... / <button onClick={clearSearch} className="text-blue-600 hover:underline">クリアして選択モードに戻る</button>
                </span>
              ) : (
                <span>
                  💡 フィールドをクリックしてSKU選択、または文字入力で検索開始。アラート商品は赤色で表示されます。
                </span>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded mb-8">
            <h4 className="font-medium mb-3 text-gray-700">一括SKU設定</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label>
                <span className="text-gray-700">在庫確保日数:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={updatedSecureDays}
                  onChange={(e) => setUpdatedSecureDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </label>
              <label>
                <span className="text-gray-700">納品確保日数:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={updatedDeliveryDays}
                  onChange={(e) => setUpdatedDeliveryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </label>
              <label>
                <span className="text-gray-700">仕入先:</span>
                <input
                  type="text"
                  value={bulkSupplier}
                  onChange={(e) => setBulkSupplier(e.target.value)}
                  placeholder="例: 株式会社テスト"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </label>
            </div>
            <button
              onClick={bulkUpdateConfig}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              すべてのSKUに反映
            </button>
          </div>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
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
          )}

          {selectedSKU && configMap[selectedSKU] && (
            <div className="mt-6 p-4 border rounded bg-white space-y-4">
              <h3 className="font-semibold mb-4 text-lg">SKU設定: {selectedSKU}</h3>
              
              <div className="bg-gray-50 p-4 rounded">
                <h4 className="font-medium mb-3 text-gray-700">SP-API取得データ（表示のみ）</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">ASIN:</span>
                    <span className="ml-2 font-mono">{configMap[selectedSKU]?.asin || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">商品名:</span>
                    <span className="ml-2">{configMap[selectedSKU]?.product_name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">現在在庫:</span>
                    <span className="ml-2">{configMap[selectedSKU]?.current_inventory || 0} 個</span>
                  </div>
                  <div>
                    <span className="text-gray-600">販売価格:</span>
                    <span className="ml-2">¥{(configMap[selectedSKU]?.sales_price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded">
                <h4 className="font-medium mb-3 text-gray-700">SP-API未対応データ（手動入力）</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700 font-medium">JANコード:</span>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={updatedJanCode}
                        onChange={(e) => setUpdatedJanCode(e.target.value)}
                        placeholder="例: 4901234567890"
                        maxLength={13}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                      <span className="text-xs text-gray-500 mt-1 block">
                        商品のJANバーコード（13桁または8桁）- データベースに保存されます
                      </span>
                    </div>
                  </label>
                  
                  <label className="block">
                    <span className="text-gray-700 font-medium">仕入先:</span>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={updatedSupplier}
                        onChange={(e) => setUpdatedSupplier(e.target.value)}
                        placeholder="例: 株式会社サンプル"
                        maxLength={255}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                      <span className="text-xs text-gray-500 mt-1 block">
                        商品の仕入先会社名 - データベースに保存されます
                      </span>
                    </div>
                  </label>
                  
                  <label className="block">
                    <span className="text-gray-700 font-medium">仕入価格:</span>
                    <div className="mt-1">
                      <input
                        type="number"
                        min="0"
                        max="99999999"
                        step="1"
                        value={updatedPurchasePrice}
                        onChange={(e) => setUpdatedPurchasePrice(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                      />
                      <span className="text-xs text-gray-500 mt-1 block">
                        商品の仕入価格（円）- データベースに保存されます（最大99,999,999円）
                      </span>
                    </div>
                  </label>
                  
                  {(updatedJanCode || updatedSupplier || updatedPurchasePrice > 0) && (
                    <div className="mt-4 p-3 bg-orange-100 rounded border-l-4 border-orange-500">
                      <h5 className="text-sm font-medium text-orange-800 mb-2">入力データプレビュー:</h5>
                      <div className="space-y-1 text-xs text-orange-700">
                        {updatedJanCode && <div>JANコード: {updatedJanCode}</div>}
                        {updatedSupplier && <div>仕入先: {updatedSupplier}</div>}
                        {updatedPurchasePrice > 0 && <div>仕入価格: ¥{updatedPurchasePrice.toLocaleString()}</div>}
                      </div>
                      <div className="text-xs text-orange-600 mt-2">
                        ✓ 「設定を更新」ボタンでデータベースに保存されます
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-medium mb-3 text-gray-700">設定可能項目</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700 font-medium">在庫確保日数（納品点算出用）:</span>
                    <div className="mt-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={updatedSecureDays}
                        onChange={(e) => setUpdatedSecureDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-500 mt-1 block">
                        納品点を算出する際の基準日数（デフォルト：30日）
                      </span>
                    </div>
                  </label>
                  
                  <label className="block">
                    <span className="text-gray-700 font-medium">納品確保日数（納品推奨数算出用）:</span>
                    <div className="mt-1">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={updatedDeliveryDays}
                        onChange={(e) => setUpdatedDeliveryDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-xs text-gray-500 mt-1 block">
                        納品推奨数を算出する際の基準日数（デフォルト：45日）
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {(() => {
                const analysis = analyzeSales(selectedSKU);
                const currentStock = configMap[selectedSKU]?.current_inventory || 0;
                const alertTriggered = currentStock < analysis.deliveryPoint;
                
                return (
                  <div className="bg-green-50 p-4 rounded">
                    <h4 className="font-medium mb-3 text-gray-700">納品アラート分析情報</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">直近30日平均販売数:</span>
                        <span className="ml-2">{analysis.dailyAverage.toFixed(1)} 個/日</span>
                      </div>
                      <div>
                        <span className="text-gray-600">過去90日平均販売数:</span>
                        <span className="ml-2">{analysis.past90DaysAverage.toFixed(1)} 個/日</span>
                      </div>
                      <div>
                        <span className="text-gray-600">納品点:</span>
                        <span className="ml-2 font-bold">{analysis.deliveryPoint} 個</span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({analysis.dailyAverage.toFixed(1)} × {updatedSecureDays}日)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">納品推奨数:</span>
                        <span className="ml-2 font-bold text-blue-600">{analysis.recommendedDeliveryQuantity} 個</span>
                        <span className="text-xs text-gray-500 ml-1">
                          (目標在庫 - 現在庫)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">アラート状態:</span>
                        <span className={`ml-2 font-medium ${alertTriggered ? 'text-red-600' : 'text-green-600'}`}>
                          {alertTriggered ? '🚨 要納品' : '✅ 正常'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">販売傾向:</span>
                        <span className={`ml-2 font-medium ${
                          analysis.trendColor === 'blue' ? 'text-blue-600' : 
                          analysis.trendColor === 'yellow' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {analysis.trendColor === 'blue' ? '📈 増加傾向' : 
                           analysis.trendColor === 'yellow' ? '📉 減少傾向' : '➡️ 横ばい'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">利益率:</span>
                        <span className="ml-2">
                          {updatedPurchasePrice > 0 && (configMap[selectedSKU]?.sales_price || 0) > 0
                            ? `${(((configMap[selectedSKU]?.sales_price || 0) - updatedPurchasePrice) / (configMap[selectedSKU]?.sales_price || 1) * 100).toFixed(1)}%`
                            : '未計算'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">予想利益/日:</span>
                        <span className="ml-2">
                          {updatedPurchasePrice > 0 && (configMap[selectedSKU]?.sales_price || 0) > 0
                            ? `¥${(((configMap[selectedSKU]?.sales_price || 0) - updatedPurchasePrice) * analysis.dailyAverage).toLocaleString()}`
                            : '未計算'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {alertTriggered && (
                      <div className="mt-4 p-3 bg-red-100 rounded border-l-4 border-red-500">
                        <h5 className="text-sm font-medium text-red-800 mb-2">🚨 納品アラート発動中</h5>
                        <div className="space-y-1 text-xs text-red-700">
                          <div>現在在庫: {currentStock}個 ＜ 納品点: {analysis.deliveryPoint}個</div>
                          <div>推奨納品数: {analysis.recommendedDeliveryQuantity}個を至急発注してください</div>
                          <div>このまま放置すると約{Math.round(currentStock / Math.max(analysis.dailyAverage, 0.1))}日で在庫切れの可能性</div>
                        </div>
                      </div>
                    )}
                    
                    {analysis.trendColor !== 'normal' && (
                      <div className={`mt-4 p-3 rounded border-l-4 ${
                        analysis.trendColor === 'blue' ? 'bg-blue-100 border-blue-500' : 'bg-yellow-100 border-yellow-500'
                      }`}>
                        <h5 className={`text-sm font-medium mb-2 ${
                          analysis.trendColor === 'blue' ? 'text-blue-800' : 'text-yellow-800'
                        }`}>
                          {analysis.trendColor === 'blue' ? '📈 販売増加傾向を検出' : '📉 販売減少傾向を検出'}
                        </h5>
                        <div className={`space-y-1 text-xs ${
                          analysis.trendColor === 'blue' ? 'text-blue-700' : 'text-yellow-700'
                        }`}>
                          <div>過去90日平均: {analysis.past90DaysAverage.toFixed(1)}個/日</div>
                          <div>直近30日平均: {analysis.recent30DaysAverage.toFixed(1)}個/日</div>
                          <div>変化率: {analysis.past90DaysAverage > 0 ? 
                            ((analysis.recent30DaysAverage / analysis.past90DaysAverage - 1) * 100).toFixed(1) : '0'}%</div>
                          {analysis.trendColor === 'blue' && 
                            <div>💡 需要増加に備えて納品確保日数の見直しを検討してください</div>
                          }
                          {analysis.trendColor === 'yellow' && 
                            <div>💡 需要減少により過剰在庫のリスクがあります</div>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => updateConfig(selectedSKU)}
                disabled={!selectedSKU}
                className={`w-full mt-4 px-4 py-3 rounded-md font-medium transition-colors ${
                  selectedSKU 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {selectedSKU ? '設定をデータベースに保存' : 'SKUを選択してください'}
              </button>
              
              {selectedSKU && configMap[selectedSKU] && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>最終更新:</span>
                    <span>{configMap[selectedSKU].updated_at ? 
                      new Date(configMap[selectedSKU].updated_at!).toLocaleString('ja-JP') : 
                      '未保存'
                    }</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>データベース状態:</span>
                    <span className="text-green-600">✓ 同期済み</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-center mb-8 text-[#202124]">商品一覧</h1>
        <div className="max-w-7xl mx-auto overflow-x-auto">
          <table className="min-w-full bg-white rounded-md shadow-sm text-sm">
            <thead className="bg-[#f1f3f4] text-left font-medium text-[#5f6368]">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">商品名</th>
                <th className="px-4 py-2">ASIN</th>
                <th className="px-4 py-2">商品タイプ</th>
                <th className="px-4 py-2">現在在庫</th>
                <th className="px-4 py-2">販売価格</th>
                <th className="px-4 py-2">日次販売数</th>
                <th className="px-4 py-2">納品点</th>
                <th className="px-4 py-2">納品推奨数</th>
                <th className="px-4 py-2">販売傾向</th>
                <th className="px-4 py-2">データ年月</th>
              </tr>
            </thead>
            <tbody>
              {latestProducts.map((p) => {
                const sku = p.出品者SKU;
                const analysis = analyzeSales(sku);
                const currentStock = p.在庫数;
                const alertTriggered = currentStock < analysis.deliveryPoint;
                
                let rowColorClass = '';
                if (analysis.trendColor === 'blue') {
                  rowColorClass = 'bg-blue-50 border-l-4 border-blue-300';
                } else if (analysis.trendColor === 'yellow') {
                  rowColorClass = 'bg-yellow-50 border-l-4 border-yellow-300';
                }
                
                if (alertTriggered) {
                  rowColorClass = 'bg-red-100 border-l-4 border-red-400';
                }
                
                return (
                  <tr key={sku} className={rowColorClass || ''}>
                    <td className="px-4 py-2 font-mono text-xs">{sku}</td>
                    <td className="px-4 py-2 text-blue-700">
                      <Link href={`/products/${sku}`} className="hover:underline">
                        {p.商品名}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{p.ASIN}</td>
                    <td className="px-4 py-2">{p.商品タイプ}</td>
                    <td className="px-4 py-2">
                      <span className={alertTriggered ? 'text-red-600 font-bold' : ''}>
                        {p.在庫数} 個
                      </span>
                    </td>
                    <td className="px-4 py-2">¥{p.販売価格?.toLocaleString()}</td>
                    <td className="px-4 py-2">{analysis.dailyAverage.toFixed(1)}/日</td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{analysis.deliveryPoint} 個</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-bold ${
                        analysis.recommendedDeliveryQuantity > 0 ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {analysis.recommendedDeliveryQuantity > 0 ? 
                          `${analysis.recommendedDeliveryQuantity} 個` : '不要'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        analysis.trendColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                        analysis.trendColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {analysis.trendColor === 'blue' ? '📈 増加' :
                         analysis.trendColor === 'yellow' ? '📉 減少' : '➡️ 横ばい'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.データ年月}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="max-w-7xl mx-auto mt-6">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="text-sm font-medium mb-3 text-gray-700">表示説明</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-3 bg-red-100 border-l-4 border-red-400 mr-2"></div>
                  <span>🚨 納品アラート発動中（要納品）</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-3 bg-blue-50 border-l-4 border-blue-300 mr-2"></div>
                  <span>📈 販売増加傾向</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-3 bg-yellow-50 border-l-4 border-yellow-300 mr-2"></div>
                  <span>📉 販売減少傾向</span>
                </div>
              </div>
              <div className="space-y-1">
                <div><strong>納品点:</strong> 日次販売数 × 在庫確保日数</div>
                <div><strong>納品推奨数:</strong> (日次販売数 × 納品確保日数) - 現在庫</div>
                <div><strong>アラート条件:</strong> 現在庫 ＜ 納品点</div>
              </div>
              <div className="space-y-1">
                <div><strong>増加傾向:</strong> 直近30日の販売が過去90日比で10%以上増</div>
                <div><strong>減少傾向:</strong> 直近30日の販売が過去90日比で10%以上減</div>
                <div><strong>横ばい:</strong> 販売数に大きな変化なし</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={scrollToGraph}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-[#1a73e8] text-white shadow-lg flex items-center justify-center hover:bg-[#1967d2] transition"
        aria-label="ページ上部へスクロール"
      >
        <ArrowUpwardIcon />
      </button>
    </div>
  );
}