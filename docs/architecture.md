# Architecture

## 概要

LOGEX は、Next.js フロントエンドと Django REST API を分離した構成の在庫管理アプリです。  
Amazon SP-API から取得した在庫情報と、自前で管理する SKU 設定情報を組み合わせて、発注判断に使える画面を提供します。

## 構成

```text
Browser
  -> Next.js
  -> Django REST API
     -> PostgreSQL
     -> Amazon SP-API
     -> Chatwork API
```

## フロントエンドの責務

- SKU 一覧表示
- 在庫アラートの可視化
- 発注支援 UI
- ログイン状態の制御
- API レスポンスの整形
- API 失敗時のフォールバック処理

主要ファイル:

- [page.tsx](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/page.tsx)
- [products/page.tsx](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/products/page.tsx)
- [purchase-order/page.tsx](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/purchase-order/page.tsx)
- [fbaData.ts](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/lib/fbaData.ts)

## バックエンドの責務

- 認証 API の提供
- SKU 設定の取得・更新
- 時系列データの集計
- 利益率や在庫日数などの計算
- Amazon SP-API との通信
- Chatwork 通知

主要ファイル:

- [models.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/models.py)
- [views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)
- [spapi_auth.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/spapi_auth.py)
- [spapi_client.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/spapi_client.py)

## データフロー

### SKU 一覧画面

1. フロントが `all-sku-configs` を取得
2. 追加で SP-API 在庫を取得
3. `sellerSku` をキーに在庫をマージ
4. 一覧画面で在庫不足や販売傾向を表示

### 発注支援

1. SKU ごとの `daily_sales_estimate` を利用
2. `secure_days` と `delivery_days` を掛けて発注点と必要在庫を算出
3. 現在在庫と比較して推奨発注数を表示

## 設計上のポイント

- 認証は Cookie ベースに寄せ、フロントでトークン文字列を直接扱わない
- 外部 API 連携はバックエンドに閉じ込める
- 業務判断ロジックは表示だけでなく API 側にも持たせる
- サンプルデータや CSV を使って、API 未接続時も画面確認しやすくしている

## 現状の課題

- ビュー層にロジックがやや集中している
- テスト整備がまだ弱い
- デプロイ用ディレクトリと開発用ディレクトリの整理余地がある

このあたりは、今後のリファクタリング対象として説明しやすいポイントでもあります。
