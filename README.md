# LOGEX

Amazon FBA 出品者向けの在庫管理・発注支援 Web アプリです。  
SKU ごとの在庫推移、日次販売数の推定、発注アラート、推奨発注数、利益率の確認を 1 つの画面で扱えるように設計しています。

就職活動用のポートフォリオとしては、単なる CRUD ではなく、外部 API 連携、業務ロジック、認証、データ可視化、デプロイを含むフルスタック開発経験を伝えられる構成になっています。

## URL

- Frontend: `https://autofba.net`
- Backend API: `https://autofba.net/`

## 補助ドキュメント

- [docs/README.md](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/docs/README.md)
- [Nextjs/README.md](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/README.md)
- [app-dep/docs/spapi_lwa_flow.md](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/app-dep/docs/spapi_lwa_flow.md)

## 1. プロジェクト概要

### 背景

Amazon FBA 運用では、SKU ごとの在庫量、販売速度、発注リードタイム、利益率を横断して判断する必要があります。  
スプレッドシートだけでは追いにくく、欠品や過剰在庫が起きやすいため、在庫判断を Web アプリとして一元化することを目的に開発しました。

### 解決したい課題

- SKU ごとの在庫状況を一覧で把握しづらい
- 発注のタイミングが担当者の勘に依存しやすい
- 利益率と在庫判断を別々に管理していて判断コストが高い
- Amazon SP-API 連携やデータ更新処理を手作業で回すのが煩雑

### このアプリでできること

- SKU 一覧で在庫状況と販売傾向を俯瞰
- 在庫推移と価格推移の確認
- 安全在庫日数と発注リードタイムから推奨発注数を自動計算
- 利益率、日次利益の概算表示
- Amazon SP-API から在庫情報を取得して画面に反映
- SKU 設定の CSV エクスポート
- 認証済みユーザー単位での利用

## 2. ポートフォリオとしての見どころ

### フルスタック構成

- Frontend: Next.js 15 / React 19 / TypeScript
- Backend: Django / Django REST Framework
- 認証: Cookie ベース JWT 認証
- 外部連携: Amazon SP-API, Chatwork API
- データ処理: CSV 取り込み、SKU ごとの集計、時系列分析

### 実務に近い設計要素

- 在庫判断ロジックを API と UI の両面で扱う業務アプリ設計
- 外部 API のアクセストークンを暗号化して保存
- フロントは静的エクスポートを前提に構成し、配信コストを意識
- バックエンドは API サーバーとして責務を分離
- 認証、CORS、CSRF、Cookie を考慮した Web アプリ構成

### 採用担当に見てほしい点

- 画面を作るだけでなく、業務ロジックまで実装していること
- 外部 API 連携を含むバックエンド実装ができること
- データモデル、API、UI を一貫して設計していること
- 「何を作ったか」だけでなく「なぜそう設計したか」を説明できること

## 3. 主な機能

### 3.1 SKU 一覧・在庫モニタリング

- SKU ごとの最新在庫を一覧表示
- 在庫不足時はアラート表示
- 販売傾向に応じて行の見た目を変化
- SKU 詳細ページへの導線を用意

該当実装:
- [Nextjs/src/app/products/page.tsx](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/products/page.tsx)
- [Django/logex_web_app/views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)

### 3.2 発注支援ロジック

推奨発注数は次の考え方で計算しています。

```text
発注点 = 日次販売数 × 安全在庫日数
必要在庫 = 日次販売数 × 発注リードタイム
推奨発注数 = max(必要在庫 - 現在在庫, 0)
```

- 欠品しそうな SKU を一覧化
- 安全在庫日数とリードタイムを画面から更新可能
- 現在在庫と比較して発注対象を絞り込み

該当実装:
- [Nextjs/src/app/purchase-order/page.tsx](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/purchase-order/page.tsx)
- [Django/logex_web_app/views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)

### 3.3 利益率の可視化

- 仕入価格と販売価格から利益率を算出
- 日次利益の概算を表示
- 手入力された仕入値のシミュレーションが可能

### 3.4 Amazon SP-API 連携

- FBA 在庫情報の取得
- 手数料見積もり取得
- レポート作成
- 注文情報、財務イベント、カタログ情報の取得 API を用意

該当実装:
- [Django/logex_web_app/spapi_client.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/spapi_client.py)
- [Django/logex_web_app/views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)
- [Nextjs/src/app/lib/spapiApi.ts](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/lib/spapiApi.ts)

### 3.5 認証機能

- ユーザー登録
- ログイン / ログアウト
- `auth/me` によるセッション確認
- Cookie JWT による認証状態の維持

該当実装:
- [Django/logex_web_app/auth.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/auth.py)
- [Django/logex_web_app/views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)
- [Nextjs/src/app/lib/authApi.ts](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/src/app/lib/authApi.ts)

### 3.6 CSV / データ処理

- CSV ベースの SKU データ取り扱い
- ビルド前処理で商品 JSON を生成
- エクスポート機能でデータ出力

該当実装:
- [Nextjs/scripts/build-product-json.mjs](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Nextjs/scripts/build-product-json.mjs)
- [Django/logex_web_app/views.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/views.py)

## 4. 技術スタック

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- MUI
- Recharts

### Backend

- Django 4
- Django REST Framework
- Simple JWT
- cryptography
- requests

### Infrastructure / Deployment

- AWS を想定した静的フロントエンド + API サーバー構成
- Nginx リバースプロキシ運用を想定
- `Nextjs/` はフロントエンド本体
- `Django/` は開発用バックエンド
- `app-dep/` はデプロイ用バックエンド構成の作業ディレクトリ

## 5. アーキテクチャ

```text
Next.js (UI)
  -> Cookie / CSRF 付き API リクエスト
Django REST API
  -> PostgreSQL
  -> Amazon SP-API
  -> Chatwork API
```

### 設計方針

- UI と API を分離し、責務を明確化
- 認証はフロントでトークンを直接持たず、Cookie ベースで管理
- Amazon リフレッシュトークンは暗号化して DB 保存
- フロント側では API 失敗時にローカル CSV へフォールバックする設計を一部採用

## 6. データモデル

主なモデルは `SKUConfig` です。

保持している代表項目:

- `sku`
- `data_month`
- `product_name`
- `jan_code`
- `supplier`
- `purchase_price`
- `sales_price`
- `secure_days`
- `delivery_days`
- `current_inventory`
- `daily_sales_estimate`
- `asin`
- `refresh_token_enc`

該当実装:
- [Django/logex_web_app/models.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/models.py)

## 7. セキュリティ上の工夫

- Cookie JWT 認証
- `HttpOnly` Cookie の利用
- CORS / CSRF を考慮した設定
- Amazon SP-API のリフレッシュトークンを暗号化保存
- 認証必須 API を Django REST Framework の permission で制御

該当実装:
- [Django/logex_config/settings.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_config/settings.py)
- [Django/logex_web_app/encryption.py](/c:/Users/ebao/Documents/task/LOGEX/logex-web-project/Django/logex_web_app/encryption.py)

## 8. ローカル起動方法

### 前提

- Node.js 20 以上
- Python 3.10 以上
- PostgreSQL

### Frontend

```bash
cd Nextjs
npm install
npm run dev
```

必要に応じて `Nextjs/.env.local` を作成します。

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

### Backend

```bash
cd Django
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

`Django/.env` の例:

```env
SECRET_KEY=your-secret-key
DB_NAME=mydb
DB_USER=myuser
DB_PASSWORD=mypassword
DB_HOST=localhost
DB_PORT=5432
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

SPAPI_ENCRYPTION_KEY=base64-generated-key

SP_API_LWA_CLIENT_ID=your-lwa-client-id
SP_API_LWA_CLIENT_SECRET=your-lwa-client-secret
SP_API_AWS_ACCESS_KEY=your-aws-access-key
SP_API_AWS_SECRET_KEY=your-aws-secret-key
SP_API_ROLE_ARN=your-role-arn
SP_API_REFRESH_TOKEN_SANDBOX=optional-sandbox-token
```

補足:
- 現在の `settings.py` では PostgreSQL 前提です
- SP-API 関連の環境変数が未設定だと Django は起動できません

## 9. ディレクトリ構成

```text
logex-web-project/
├─ Nextjs/      # フロントエンド
├─ Django/      # 開発用バックエンド
├─ app-dep/     # デプロイ用バックエンド構成
├─ request.http
└─ README.md
```

## 10. 今後の改善案

- テストコードの拡充
- 画面キャプチャ付きの機能紹介追加
- 在庫推移グラフの UI 改善
- バルク更新 API とフロント実装の整合性改善
- データ文字コードや文言の整理
- Docker による開発環境の標準化

## 11. 開発者として伝えたいこと

このリポジトリでは、次の力を示すことを意識しています。

- 課題を業務フローに落として Web アプリとして設計する力
- フロントエンド、バックエンド、外部 API 連携を横断して実装する力
- 認証やトークン管理を含めて現実的なシステム構成を考える力
- データの見せ方と業務判断ロジックを結びつける力

完成度の面では改善余地もありますが、単機能な練習アプリではなく、実務に近いテーマを自分で切り分けて形にした点がこのプロジェクトの価値です。
