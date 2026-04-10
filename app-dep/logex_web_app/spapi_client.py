"""SP-API client with LWA + AWS SigV4 signing."""
import requests
from typing import Optional, Dict, Any
from requests_aws4auth import AWS4Auth
from django.conf import settings
from .spapi_auth import LWAClient


class SPAPIClient:
    """Selling Partner API client (JP marketplace default)."""

    def __init__(self, refresh_token: str):
        self.refresh_token = refresh_token
        self.lwa_client = LWAClient(refresh_token)

        # AWS credentials (user or assumed role; role_arn reserved for future use)
        self.aws_access_key = settings.SP_API_AWS_ACCESS_KEY
        self.aws_secret_key = settings.SP_API_AWS_SECRET_KEY
        self.role_arn = settings.SP_API_ROLE_ARN

        self.endpoint = getattr(
            settings, "SP_API_ENDPOINT", "https://sellingpartnerapi-fe.amazon.com"
        )
        self.region = getattr(settings, "SP_API_REGION", "us-west-2")
        self.marketplace_id = getattr(settings, "SP_API_MARKETPLACE_ID", "A1VC38T7YXB528")

    def _get_auth(self) -> AWS4Auth:
        """Build AWS SigV4 auth object."""
        return AWS4Auth(
            self.aws_access_key,
            self.aws_secret_key,
            self.region,
            "execute-api",
        )

    def _get_headers(self) -> Dict[str, str]:
        """Headers including LWA access token."""
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
        """Send request to SP-API with AWS SigV4 and LWA access token."""
        url = f"{self.endpoint}{path}"
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

    # ==================== FBA Inventory ====================

    def get_inventory_summaries(
        self, granularity_type: str = "Marketplace", granularity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        params = {
            "granularityType": granularity_type,
            "granularityId": granularity_id or self.marketplace_id,
            "marketplaceIds": self.marketplace_id,
        }

        return self.request("GET", "/fba/inventory/v1/summaries", params=params)

    # ==================== Reports ====================

    def create_report(
        self, report_type: str, marketplace_ids: Optional[list] = None, **kwargs
    ) -> Dict[str, Any]:
        data = {
            "reportType": report_type,
            "marketplaceIds": marketplace_ids or [self.marketplace_id],
            **kwargs,
        }

        return self.request("POST", "/reports/2021-06-30/reports", data=data)

    def get_report(self, report_id: str) -> Dict[str, Any]:
        return self.request("GET", f"/reports/2021-06-30/reports/{report_id}")

    def get_report_document(self, report_document_id: str) -> Dict[str, Any]:
        return self.request(
            "GET", f"/reports/2021-06-30/documents/{report_document_id}"
        )

    # ==================== Fees ====================

    def get_my_fees_estimate(self, asin: str, price: float, is_fba: bool = True) -> Dict[str, Any]:
        data = {
            "FeesEstimateRequest": {
                "MarketplaceId": self.marketplace_id,
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

    # ==================== Catalog ====================

    def get_catalog_item(self, asin: str) -> Dict[str, Any]:
        params = {
            "marketplaceIds": self.marketplace_id,
            "includedData": "summaries,attributes,dimensions,images",
        }

        return self.request("GET", f"/catalog/2022-04-01/items/{asin}", params=params)

    # ==================== Orders ====================

    def get_orders(
        self,
        created_after: str,
        created_before: Optional[str] = None,
        order_statuses: Optional[list] = None,
    ) -> Dict[str, Any]:
        params = {
            "MarketplaceIds": self.marketplace_id,
            "CreatedAfter": created_after,
        }

        if created_before:
            params["CreatedBefore"] = created_before

        if order_statuses:
            params["OrderStatuses"] = ",".join(order_statuses)

        return self.request("GET", "/orders/v0/orders", params=params)

    # ==================== Finances ====================

    def list_financial_events(
        self, posted_after: Optional[str] = None, posted_before: Optional[str] = None
    ) -> Dict[str, Any]:
        params = {}

        if posted_after:
            params["PostedAfter"] = posted_after

        if posted_before:
            params["PostedBefore"] = posted_before

        return self.request("GET", "/finances/v0/financialEvents", params=params)
