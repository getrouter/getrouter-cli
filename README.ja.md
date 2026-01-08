# GetRouter CLI

getrouter.dev 向けの CLI — API キーやサブスクリプションを管理し、vibecoding ツールを設定します。

[English](README.md) | [简体中文](README.zh-cn.md) | 日本語

## 要件

- Node.js >= 18
- Bun >= 1.3.5（開発用）

## インストール

npm で公開済みの場合:

npm で

```bash
npm install -g @getrouter/getrouter-cli
# or
npx @getrouter/getrouter-cli --help
```

bun で

```bash
bun add -g @getrouter/getrouter-cli
# or
bunx @getrouter/getrouter-cli --help
```

ローカルビルド:

```bash
bun install
bun run build
```

## クイックスタート

- `getrouter login` — デバイスフローでログイン
- `getrouter keys` — API キーを一覧表示（作成/更新/削除は対話式）
- `getrouter codex` — Codex を設定（`~/.codex/config.toml` + `~/.codex/auth.json` を書き込み）

## 認証

デバイスフローでのログイン:

```bash
getrouter login
```

表示された URL をブラウザで開くと、CLI はトークンを受け取るまでポーリングします。
すでにログイン済みでも `getrouter login` を再実行すると、ローカルの auth.json は新しいトークンで上書きされます。

## よく使うコマンド

- `getrouter login` — デバイスフローでログイン
- `getrouter logout` — ローカルのトークンを削除
- `getrouter status` — ログイン + サブスクリプション状態を表示
- `getrouter keys` — API キーの一覧/作成/更新/削除
- `getrouter usages` — 直近 7 日間の使用量（チャート + テーブル）
- `getrouter codex` — Codex を設定（config.toml + auth.json）
- `getrouter claude --install` — Anthropic 互換の環境変数をインストール

メモ:

- `getrouter keys` はデフォルトで一覧表示し、作成/更新/削除は対話式です。
- `getrouter status` はトークンを表示せずに認証/サブスクリプション情報を要約します。

## 環境変数の設定

`getrouter codex` は Codex の設定ファイルを書き込みます（シェルの環境変数は変更しません）。

```bash
getrouter codex
```

Codex の設定/認証から GetRouter の項目を削除する場合:

```bash
getrouter codex uninstall
```

書き込まれるファイル（codex）:

- `~/.codex/config.toml`（model + reasoning + provider 設定）
- `~/.codex/auth.json`（OPENAI_API_KEY）
- `~/.getrouter/codex-backup.json`（`getrouter codex uninstall` 用のバックアップ。uninstall で削除）

`getrouter claude` は Anthropic 互換の環境変数を `~/.getrouter/env.sh`（または `env.ps1`）へ書き込みます。

```bash
getrouter claude --install
```

オプション（claude のみ）:

- `--install`: `source ~/.getrouter/env.sh` をシェル rc に追記し、`claude` の自動 source hook をインストールして即時読み込みを試みます。初回はシェルの再読み込み（または `source ~/.zshrc`）が必要です。

書き込まれる変数（claude）:

```
ANTHROPIC_BASE_URL=https://api.getrouter.dev/claude
ANTHROPIC_API_KEY=<consumer api key>
```

## 設定とファイル

デフォルトの設定ディレクトリ: `~/.getrouter`（`GETROUTER_CONFIG_DIR` で上書き）

- `config.json`: CLI 設定
- `auth.json`: アクセス/リフレッシュトークン
- `env.sh` / `env.ps1`: 環境変数

設定を変更する場合は `~/.getrouter/config.json` を直接編集してください。

## 開発

- `bun install` — 依存関係をインストール
- `bun run dev -- --help` — ローカルで CLI を実行してヘルプ表示
- `bun run format` — Biome でフォーマットと lint
- `bun run test` — テスト実行
- `bun run typecheck` — TypeScript 型チェック
