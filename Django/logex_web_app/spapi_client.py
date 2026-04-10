"""
SP-API クライアント
AWS署名v4によるリクエスト署名とSP-APIエンドポイントへのリクエスト送信
"""
import requests
from typing import Optional, Dict, Any
from requests_aws4auth import AWS4Auth
from django.conf import settings
from .spapi_auth import LWAClient


class SPAPIClient:
    """SP-API クライアント（日本マーケットプレイス）"""

    # 日本マーケットプレイス設定
    ENDPOINT = "https://sellingpartnerapi-fe.amazon.com"
    REGION = "us-west-2"  # FE（極東）エンドポイントのAWSリージョン
    MARKETPLACE_ID = "A1VC38T7YXB528"  # 日本

    def __init__(self, refresh_token: str):
        """
        Args:
            refresh_token: SP-APIリフレッシュトークン
        """
        self.refresh_token = refresh_token
        self.lwa_client = LWAClient(refresh_token)

        # AWS認証情報（IAMユーザー）
        self.aws_access_key = settings.SP_API_AWS_ACCESS_KEY
        self.aws_secret_key = settings.SP_API_AWS_SECRET_KEY
        self.role_arn = settings.SP_API_ROLE_ARN

    def _get_auth(self) -> AWS4Auth:
        """
        AWS署名v4認証オブジェクトを取得

        Returns:
            AWS4Auth: AWS署名認証
        """
        return AWS4Auth(
            self.aws_access_key,
            self.aws_secret_key,
            self.REGION,
            "execute-api",
        )

    def _get_headers(self) -> Dict[str, str]:
        """
        SP-APIリクエストヘッダーを取得

        Returns:
            Dict[str, str]: リクエストヘッダー
        """
        access_token = self.lwa_client.get_access_token()

        return {
            "x-amz-access-token": access_token,
            "Content-Type": "application/json",
        }

    def request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        SP-APIへリクエストを送信

        Args:
            method: HTTPメソッド（GET, POST等）
            path: APIパス（例: "/fba/inventory/v1/summaries"）
            params: クエリパラメータ
            data: リクエストボディ

        Returns:
            Dict[str, Any]: レスポンスJSON

        Raises:
            Exception: リクエスト失敗時
        """
        url = f"{self.ENDPOINT}{path}"
        headers = self._get_headers()
        auth = self._get_auth()

        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=data,
            auth=auth,
        )

        if response.status_code >= 400:
            raise Exception(
                f"SP-API request failed: {response.status_code} - {response.text}"
            )

        return response.json()

    # ==================== FBA在庫API ====================

    def get_inventory_summaries(
        self, granularity_type: str = "Marketplace", granularity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        FBA在庫サマリーを取得

        Args:
            granularity_type: 集計タイプ（Marketplace or MarketplaceId）
            granularity_id: マーケットプレイスID（指定しない場合はデフォルトの日本）

        Returns:
            Dict[str, Any]: 在庫サマリー情報
        """
        params = {
            "granularityType": granularity_type,
            "granularityId": granularity_id or self.MARKETPLACE_ID,
            "marketplaceIds": self.MARKETPLACE_ID,
        }

        return self.request("GET", "/fba/inventory/v1/summaries", params=params)

    # ==================== レポートAPI ====================

    def create_report(
        self, report_type: str, marketplace_ids: Optional[list] = None, **kwargs
    ) -> Dict[str, Any]:
        """
        レポート生成リクエストを作成

        Args:
            report_type: レポートタイプ（例: GET_FBA_ESTIMATED_FBA_FEES_TXT_DATA）
            marketplace_ids: マーケットプレイスIDリスト
            **kwargs: その他のレポートオプション

        Returns:
            Dict[str, Any]: レポートID等
        """
        data = {
            "reportType": report_type,
            "marketplaceIds": marketplace_ids or [self.MARKETPLACE_ID],
            **kwargs,
        }

        return self.request("POST", "/reports/2021-06-30/reports", data=data)

    def get_report(self, report_id: str) -> Dict[str, Any]:
        """
        レポートのステータスを取得

        Args:
            report_id: レポートID

        Returns:
            Dict[str, Any]: レポート情報
        """
        return self.request("GET", f"/reports/2021-06-30/reports/{report_id}")

    def get_report_document(self, report_document_id: str) -> Dict[str, Any]:
        """
        レポートドキュメントのダウンロードURL等を取得

        Args:
            report_document_id: レポートドキュメントID

        Returns:
            Dict[str, Any]: ダウンロードURL等
        """
        return self.request(
            "GET", f"/reports/2021-06-30/documents/{report_document_id}"
        )

    # ==================== 手数料API ====================

    def get_my_fees_estimate(self, asin: str, price: float, is_fba: bool = True) -> Dict[str, Any]:
        """
        商品の手数料見積もりを取得

        Args:
            asin: ASIN
            price: 価格
            is_fba: FBA配送かどうか

        Returns:
            Dict[str, Any]: 手数料見積もり情報
        """
        data = {
            "FeesEstimateRequest": {
                "MarketplaceId": self.MARKETPLACE_ID,
                "IsAmazonFulfilled": is_fba,
                "PriceToEstimateFees": {
                    "ListingPrice": {"CurrencyCode": "JPY", "Amount": price}
                },
                "Identifier": asin,
            }
        }

        return self.request(
            "POST", f"/products/fees/v0/items/{asin}/feesEstimate", data=data
        )

    # ==================== カタログAPI ====================

    def get_catalog_item(self, asin: str) -> Dict[str, Any]:
        """
        カタログアイテム情報を取得

        Args:
            asin: ASIN

        Returns:
            Dict[str, Any]: カタログ情報（サイズ、重量等）
        """
        params = {
            "marketplaceIds": self.MARKETPLACE_ID,
            "includedData": "summaries,attributes,dimensions,images",
        }

        return self.request("GET", f"/catalog/2022-04-01/items/{asin}", params=params)

    # ==================== 注文API ====================

    def get_orders(
        self,
        created_after: str,
        created_before: Optional[str] = None,
        order_statuses: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        注文情報を取得

        Args:
            created_after: 注文作成日時の開始（ISO8601形式）
            created_before: 注文作成日時の終了
            order_statuses: 注文ステータスリスト

        Returns:
            Dict[str, Any]: 注文情報
        """
        params = {
            "MarketplaceIds": self.MARKETPLACE_ID,
            "CreatedAfter": created_after,
        }

        if created_before:
            params["CreatedBefore"] = created_before

        if order_statuses:
            params["OrderStatuses"] = ",".join(order_statuses)

        return self.request("GET", "/orders/v0/orders", params=params)

    # ==================== 財務API ====================

    def list_financial_events(
        self, posted_after: Optional[str] = None, posted_before: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        財務イベント（入金、手数料等）を取得

        Args:
            posted_after: 記帳日時の開始（ISO8601形式）
            posted_before: 記帳日時の終了

        Returns:
            Dict[str, Any]: 財務イベント情報
        """
        params = {}

        if posted_after:
            params["PostedAfter"] = posted_after

        if posted_before:
            params["PostedBefore"] = posted_before

        return self.request("GET", "/finances/v0/financialEvents", params=params)
