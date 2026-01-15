# レンタル会社 基幹システム プロトタイプ

React + Vite を使った画面遷移確認用のプロトタイプです。モックデータでログイン/権限切替を行い、部署別の機能カードとプレースホルダー画面へ遷移できます。

## セットアップ

```bash
npm install
npm run dev
```

開発サーバー: http://localhost:5173

## デモ用ログイン

- front01 / pass123 (フロント・営業)
- account01 / pass123 (経理)
- factory01 / pass123 (工場・ドライバー)
- admin01 / admin (全権限)

## 実装ポイント

- `src/auth/AuthContext.tsx` でモック認証とユーザー保持
- 部署ごとの権限マップ `src/data/mockData.ts`
- ホーム画面で部署切替 + カード表示制御 `src/pages/HomePage.tsx`
- 機能プレースホルダー `src/pages/FeaturePlaceholder.tsx`

## 次のステップ案

- API 連携と永続化されたログイン
- 各カード配下の一覧/検索/登録画面を実装
- テーブルコンポーネント（ページネーション・ソート・フィルタ）
- フォームバリデーションと送信確認ダイアログ
- ユーザーごとの権限設定 UI / マスター管理の CRUD 化




