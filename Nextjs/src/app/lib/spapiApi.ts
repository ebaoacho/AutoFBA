/**
 * SP-API クライアント
 * Amazon Selling Partner APIとの通信を管理
 */

import { apiFetch } from './http';

export interface SPAPIInventorySummary {
  asin?: string;
  fnSku?: string;
  sellerSku?: string;
  condition?: string;
  inventoryDetails?: {
    fulfillableQuantity?: number;
    inboundWorkingQuantity?: number;
    inboundShippedQuantity?: number;
    inboundReceivingQuantity?: number;
  };
  totalQuantity?: number;
}

export interface SPAPIFeesEstimate {
  status?: string;
  feesEstimate?: {
    totalFeesEstimate?: {
      amount?: number;
      currencyCode?: string;
    };
    feeDetails?: Array<{
      feeType?: string;
      feeAmount?: {
        amount?: number;
        currencyCode?: string;
      };
    }>;
  };
}

export interface SPAPICatalogItem {
  asin: string;
  summaries?: Array<{
    itemName?: string;
    brand?: string;
    size?: string;
    color?: string;
  }>;
  dimensions?: Array<{
    weight?: {
      value?: number;
      unit?: string;
    };
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
  }>;
}

/**
 * SP-API接続状態を確認
 */
export async function checkSPAPIConnection(): Promise<{ has_refresh_token: boolean }> {
  return apiFetch<{ has_refresh_token: boolean }>('/spapi/connection-status/');
}

export async function startSPAPIAuthorization(): Promise<{
  authorization_url: string;
  state: string;
  redirect_uri: string;
}> {
  return apiFetch('/api/spapi/auth/start/');
}

// レガシーAPI (互換性のため残す)
export async function connectionStatusApi() {
  return checkSPAPIConnection();
}

/**
 * FBA在庫サマリーを取得
 */
export async function getSPAPIInventory(): Promise<{ inventorySummaries?: SPAPIInventorySummary[] }> {
  return apiFetch('/api/spapi/inventory/');
}

/**
 * 商品の手数料見積もりを取得
 */
export async function getSPAPIFeesEstimate(
  asin: string,
  price: number
): Promise<SPAPIFeesEstimate> {
  return apiFetch('/api/spapi/fees-estimate/', {
    method: 'POST',
    body: JSON.stringify({ asin, price }),
  });
}

/**
 * SP-APIレポートを生成
 */
export async function createSPAPIReport(reportType: string): Promise<{ reportId: string }> {
  return apiFetch('/api/spapi/report/create/', {
    method: 'POST',
    body: JSON.stringify({ report_type: reportType }),
  });
}

/**
 * レポートのステータスを取得
 */
export async function getSPAPIReportStatus(reportId: string): Promise<{
  reportId: string;
  processingStatus: string;
  reportDocumentId?: string;
}> {
  return apiFetch(`/api/spapi/report/${reportId}/`);
}

/**
 * カタログアイテム情報を取得
 */
export async function getSPAPICatalogItem(asin: string): Promise<SPAPICatalogItem> {
  return apiFetch(`/api/spapi/catalog/${asin}/`);
}

export interface SPAPIOrder {
  amazonOrderId?: string;
  purchaseDate?: string;
  orderStatus?: string;
  orderTotal?: {
    amount?: number;
    currencyCode?: string;
  };
  numberOfItemsShipped?: number;
  numberOfItemsUnshipped?: number;
}

export interface SPAPIFinancialEvent {
  shipmentEventList?: Array<{
    amazonOrderId?: string;
    postedDate?: string;
    marketplaceName?: string;
  }>;
  refundEventList?: Array<{
    amazonOrderId?: string;
    postedDate?: string;
  }>;
}

/**
 * 注文情報を取得
 */
export async function getSPAPIOrders(
  createdAfter: string,
  createdBefore?: string
): Promise<{ orders?: SPAPIOrder[] }> {
  const params = new URLSearchParams({ created_after: createdAfter });
  if (createdBefore) {
    params.append('created_before', createdBefore);
  }
  return apiFetch(`/api/spapi/orders/?${params.toString()}`);
}

/**
 * 財務イベント（入金、手数料等）を取得
 */
export async function getSPAPIFinancialEvents(
  postedAfter?: string,
  postedBefore?: string
): Promise<{ financialEvents?: SPAPIFinancialEvent }> {
  const params = new URLSearchParams();
  if (postedAfter) params.append('posted_after', postedAfter);
  if (postedBefore) params.append('posted_before', postedBefore);

  const query = params.toString();
  return apiFetch(`/api/spapi/financial-events/${query ? '?' + query : ''}`);
}

/**
 * 利用可能なレポートタイプ
 */
export const REPORT_TYPES = {
  FBA_FEES: 'GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA',
  FBA_INVENTORY: 'GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA',
  FBA_STORAGE_FEES: 'GET_FBA_STORAGE_FEE_CHARGES_DATA',
  FBA_RETURNS: 'GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA',
  SALES: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
} as const;
