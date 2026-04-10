# API Overview

LOGEX の主要 API を用途単位で整理したメモです。  
厳密な OpenAPI ではなく、リポジトリ理解と面接説明向けの概要資料です。

## 認証

- `POST /auth/register/`
  ユーザー登録
- `POST /auth/login/`
  ログイン
- `POST /auth/logout/`
  ログアウト
- `GET /auth/me/`
  現在のログインユーザー確認

## ヘルスチェック

- `GET /health/`
  API 生存確認

## SKU 設定

- `POST /sku-data/create/`
  SKU 設定の作成
- `GET /sku-data/all-sku-configs/`
  SKU 設定一覧取得
- `GET /sku-data/sku-config/{sku}/`
  SKU ごとの最新設定取得
- `GET /sku-data/sku-history/{sku}/`
  SKU ごとの履歴取得
- `GET /sku-data/sku-analytics/{sku}/`
  SKU ごとの分析結果取得
- `POST /sku-data/bulk-update/`
  一括更新
- `GET /sku-data/export-all/`
  CSV エクスポート

## Chatwork

- `POST /chatwork/register-room/`
  通知先ルーム登録
- `POST /chatwork/send-notification/`
  Chatwork へ通知送信

## Amazon SP-API

- `GET /spapi/connection-status/`
  Amazon 連携済みか確認
- `GET /spapi/inventory/`
  FBA 在庫取得
- `POST /spapi/fees-estimate/`
  手数料見積もり取得
- `POST /spapi/report/create/`
  レポート作成
- `GET /spapi/report/{report_id}/`
  レポート状況取得
- `GET /spapi/catalog/{asin}/`
  商品情報取得
- `GET /spapi/orders/`
  注文情報取得
- `GET /spapi/financial-events/`
  財務イベント取得

## この API 設計で見せられること

- 認証、業務データ、外部サービス連携が分かれている
- SKU 単位の履歴 API と分析 API を分けている
- フロントが必要とする表示ロジックに対応した API を持っている
- 外部 API 連携をフロントから直接叩かせていない
