---
name: codemap
description: リポジトリ構造を分析し、アーキテクチャドキュメントを自動生成。
license: MIT
version: 1.1.0
triggers:
  - /codemap
  - /map
  - アーキテクチャ可視化
---

# Codemap

> **要約**: コードベースのアーキテクチャを分析し、構造化ドキュメントを自動生成。

## 📌 コマンド

| コマンド | 説明 |
|---------|------|
| `/codemap generate` | 全体マップ生成 |
| `/codemap analyze <path>` | 特定パス分析 |
| `/codemap diff` | 既存との差分表示 |

---

## 🔍 分析内容

### REQ-CM-001: リポジトリ構造

1. **ワークスペース検出**
   ```bash
   cat package.json | jq '.workspaces'
   ```

2. **エントリーポイント識別**
   - `src/index.ts`, `src/main.ts`
   - `bin/` 配下
   - `package.json` の `main`, `exports`

3. **フレームワーク検出**
   - Next.js: `next.config.js`, `app/`
   - Express: `app.ts`, `routes/`

### REQ-CM-002: モジュール分析

| 分析項目 | 検索方法 |
|---------|---------|
| エクスポート | `grep "^export" src/index.ts` |
| インポート | `grep "from '" src/*.ts` |
| APIルート | `ls pages/api/` or `grep router.` |
| DBモデル | `grep "^model" prisma/schema.prisma` |

---

## 📁 出力構造 (REQ-CM-003)

```
docs/CODEMAPS/
├── INDEX.md        # 全体概要
├── packages.md     # パッケージ一覧
├── backend.md      # バックエンド構造
├── frontend.md     # フロントエンド構造
├── database.md     # DBスキーマ
└── integrations.md # 外部サービス
```

### INDEX.md テンプレート

```markdown
# Codemap: [Project Name]

**Generated:** [日時]
**Version:** [バージョン]

## Overview
[プロジェクト概要]

## Structure
[ディレクトリ構造]

## Packages
| Package | Description |
|---------|-------------|
| core | コア機能 |
| api | APIサーバー |

## Entry Points
- `bin/cli.js` - CLI
- `src/index.ts` - Library
```

---

## 📊 Diff Threshold (REQ-CM-004)

**WHEN** 既存マップ更新時  
**DO** 差分率を計算し、30%超過時はユーザー承認

**出力**:
```
📊 Codemap Diff
━━━━━━━━━━━━━━
Diff: 35% ⚠️
New: 5 modules
Removed: 2 modules
Changed: 8 modules
━━━━━━━━━━━━━━
Update? (y/n)
```

**レポート保存**: `.reports/codemap-diff.txt`

---

## トレーサビリティ

- REQ-CM-001: Repository Structure Analysis
- REQ-CM-002: Module Analysis
- REQ-CM-003: Codemap Generation
- REQ-CM-004: Codemap Diff Threshold
