# SP-API LWA Flow

`app-dep/docs/spapi_lwa_flow.md` は、Amazon Selling Partner API を使うための Login with Amazon 認可フローの整理メモです。

## 目的

Amazon Seller Central で認可を受け、`authorization code` から `refresh token` を取得し、アプリから SP-API を継続利用できる状態を作ります。

## 全体フロー

1. 認証済みユーザーが Amazon 連携開始 API を呼ぶ
2. バックエンドが `state` を発行し、Seller Central の認可 URL を返す
3. ユーザーが Amazon 側で認可する
4. Amazon が `code` と `state` をコールバック URL に返す
5. バックエンドが `code` を `refresh token` に交換する
6. `refresh token` を暗号化して保存する
7. 以後は保存済み `refresh token` を使ってアクセストークンを取得し、SP-API を呼ぶ

## 関連ファイル

- `app-dep/logex_web_app/spapi_auth.py`
- `app-dep/logex_web_app/spapi_client.py`
- `app-dep/logex_web_app/views.py`
- `app-dep/logex_config/settings.py`
- `app-dep/logex_config/urls.py`

## 実装上の役割分担

### `spapi_auth.py`

- LWA の `refresh token` からアクセストークンを取得
- アクセストークンをキャッシュ

### `spapi_client.py`

- AWS Signature V4 付きで SP-API を呼ぶ
- 在庫、手数料、レポート、注文、財務イベントなどを取得

### `views.py`

- 認証状態確認 API
- SP-API を呼び出す各種エンドポイント

## 保存方針

- `refresh token` は平文で保持しない
- DB には暗号化済みの値を保存する
- 実行時のみ復号して利用する

## 運用上の注意

- `redirect_uri` は Seller Central 側の設定と完全一致が必要
- LWA クライアント ID / Secret、AWS キー、Role ARN が揃っていないと動かない
- ローカル開発と本番で URL がズレるとコールバックに失敗する
- 初回連携が未完了でも、Sandbox トークンで一部動作確認できる設計が入っている

## 面接で説明しやすいポイント

- 外部 API を単に叩くだけでなく、認可フローまで扱っている
- トークンを暗号化保存している
- フロント、バックエンド、外部サービスの責務分離を意識している
- 実務で起こりやすい認可 URL / コールバック URL 不整合まで考慮している
