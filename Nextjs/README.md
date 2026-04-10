# LOGEX Frontend

`Nextjs/` は LOGEX のフロントエンド実装です。  
Amazon FBA 向けの在庫管理アプリとして、SKU 一覧、発注支援、認証、Amazon 連携導線を提供します。

## 技術スタック

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- MUI
- Recharts

## 主な責務

- SKU 一覧画面の表示
- 在庫アラートと販売傾向の可視化
- 発注支援画面の表示
- ユーザー認証フロー
- Django API との通信
- 一部データの CSV フォールバック

## 主要ディレクトリ

```text
Nextjs/
├─ src/app/
│  ├─ components/      # Header, Sidebar などの共通 UI
│  ├─ hooks/           # カスタムフック
│  ├─ lib/             # API クライアント、データマージ処理
│  ├─ login/           # ログイン画面
│  ├─ register/        # 新規登録画面
│  ├─ connect-amazon/  # Amazon 連携導線
│  ├─ products/        # SKU 一覧 / 詳細
│  ├─ purchase-order/  # 発注支援画面
│  ├─ bulk-export/     # CSV エクスポート画面
│  └─ notifications/   # 通知設定画面
├─ public/data/        # サンプルデータ、生成 JSON
└─ scripts/            # ビルド前スクリプト
```

## ローカル起動

```bash
cd Nextjs
npm install
npm run dev
```

`Nextjs/.env.local` 例:

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

## API 通信

- API 通信は `src/app/lib/http.ts` に集約
- Cookie 認証を前提として `credentials: 'include'` を利用
- 認証 API は `authApi.ts`
- SP-API 関連は `spapiApi.ts`
- SKU 設定と FBA 在庫のマージ処理は `fbaData.ts`

## ポートフォリオ上の見どころ

- 業務アプリらしい一覧 UI と判断支援 UI を実装
- データ取得失敗時に CSV へフォールバックする設計
- バックエンド API と責務を分離したフロント構成
- 単純な CRUD ではなく、在庫判断を UI に落とし込んでいる点
