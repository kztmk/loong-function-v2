# Loong Functions v2

このプロジェクトは、Firebase Cloud Functions v2 を使用して構築されたバックエンド機能群です。
X (旧Twitter) のトレンド情報を収集するクローラー機能と、ユーザー登録機能を提供します。

## 主な機能

### 1. Xトレンドクローラー

Puppeteer を使用してXのトレンド情報を定期的に収集し、Firestore に保存します。

- **`loong.v2.crawler.writeXtrends`**

  - トリガー: スケジュール (`onSchedule`) - 日本時間の毎日4時、 8時、 12時、 16時、20時に実行。
  - 処理:
    1.  Xにログインし、トレンド情報を取得します。
    2.  取得したトレンド情報とタイムスタンプを Firestore の `XTrends` コレクションに新しいドキュメントとして追加します。
    3.  `XTrends` コレクション内のドキュメント数が6件を超えた場合、もっとも古いドキュメントを削除します。
  - 必要な環境変数: `X_LOGIN_ID`, `X_LOGIN_PASSWORD`, `X_LOGIN_ACCOUNT_NAME`

- **`loong.v2.crawler.testWriteXtrends`**
  - トリガー: HTTP (`onRequest`)
  - 処理: `writeXtrends` と同様のトレンド収集・保存処理を行いますが、古いドキュメントの削除ロジックはコメントアウトされています。テスト用途です。
  - 必要な環境変数: `X_LOGIN_ID`, `X_LOGIN_PASSWORD`, `X_LOGIN_ACCOUNT_NAME`

### 2. ユーザー登録

- **`loong.v2.auth.registerUser`**
  - トリガー: HTTP (`onRequest`) - POSTメソッドのみ許可。
  - 処理:
    1.  リクエストボディから購入時メールアドレス (`purchaseEmail`)、アカウント用メールアドレス (`accountEmail`)、パスワード (`password`) を受け取ります。
    2.  `purchaseEmail` が Firestore の `users` コレクションにすでに存在するか確認します。
    3.  存在する場合: すでにアカウントが作成されている旨を通知するメールを送信し、クライアントにメッセージを返します。
    4.  存在しない場合:
        - Firebase Authentication を使用して `accountEmail` と `password` で新しいユーザーを作成します。
        - 作成されたユーザーのUID、`purchaseEmail`、`accountEmail`、タイムスタンプを Firestore の `users` コレクションに保存します。
        - ユーザー作成成功のメールを送信し、クライアントにメッセージを返します。
  - エラー処理: パラメーター不足、ユーザー作成失敗（例: メールアドレスがすでにAuthに存在）などの場合に適切なエラーレスポンスを返します。

## セットアップと実行

### 1. 必要なツール

- Node.js（バージョン22推奨 - `functions/package.json` の `engines` を参照）
- Firebase CLI

### 2. 依存関係のインストール

```bash
cd functions
npm install
```

### 3. 環境変数の設定

`functions` ディレクトリのルートに `.env` ファイルを作成し、以下の環境変数を設定してください。

```env
MAIL_FROM=your_mail_from_address@example.com
MAIL_TO=your_mail_to_address@example.com
GMAIL_USER=your_gmail_username@gmail.com
GMAIL_PASSWORD=your_gmail_app_password
X_LOGIN_ID=your_x_login_id
X_LOGIN_PASSWORD=your_x_login_password
X_LOGIN_ACCOUNT_NAME=your_x_account_name
COMFIRM_CODE= # 用途に応じて設定 (現在は直接使用されていません)
```

**注意:** `GMAIL_PASSWORD` には、Gmailのアプリパスワードを使用してください。

### 4. ビルド

TypeScriptコードをJavaScriptにコンパイルします。

```bash
cd functions
npm run build
```

### 5. Firebase Emulator Suite でのローカル実行

```bash
cd functions
npm run serve
# またはプロジェクトルートから
# firebase emulators:start --only functions
```

デバッグを行う場合は、`firebase emulators:start --inspect-functions` を使用し、VS Codeのデバッガーをポート9229にアタッチしてください（`.vscode/launch.json` 設定済み）。

### 6. デプロイ

```bash
cd functions
npm run deploy
# またはプロジェクトルートから
# firebase deploy --only functions
```

## ディレクトリ構造 (抜粋)

```
functions/
├── lib/                  # コンパイル後のJavaScriptファイル (自動生成)
├── node_modules/         # 依存パッケージ
├── src/                  # TypeScriptソースコード
│   ├── helper/           # ヘルパー関数 (例: メール送信)
│   ├── index.ts          # メインエントリーポイント、Firebase Admin SDK初期化、環境変数読み込み
│   └── loong/
│       └── v2/
│           ├── auth/
│           │   └── register.ts # ユーザー登録関連の関数
│           └── crawler/
│               ├── crawlX.ts   # PuppeteerによるXクローリングロジック (ファイル内容は提供されていません)
│               └── index.ts    # Xトレンドクローラー関連の関数
├── .env                  # 環境変数ファイル (Git管理外)
├── .eslintrc.js          # ESLint設定ファイル
├── .prettierrc.js        # Prettier設定ファイル
├── package.json
└── tsconfig.json         # TypeScriptコンパイラ設定ファイル
```

## 主要技術スタック

- Firebase Cloud Functions v2
- TypeScript
- Node.js
- Firebase Admin SDK (Firestore, Firebase Authentication)
- Puppeteer（Webスクレイピング用）
- Dotenv（環境変数管理）
- Nodemailer（メール送信 - `helper/sendMailRegisterUser` で使用されていると推測）
- ESLint, Prettier（コード品質とフォーマット）

```

```
