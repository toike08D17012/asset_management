---
name: context-optimizer
description: コンテキストウィンドウ最適化。圧縮提案、Pre/PostToolUse Hooks、モード注入。
license: MIT
version: 1.1.0
triggers:
  - ツール呼び出し50回超過
  - ファイル編集後
  - 危険なコマンド実行前
  - /mode
---

# Context Optimizer

> **要約**: コンテキストウィンドウを最適化し、効率的なセッション管理を支援。

## 🔄 トリガーと即時アクション

### 1. Strategic Compact (REQ-CO-001/002)

**WHEN** ツール呼び出しが50回に到達  
**DO** 圧縮を提案

```
💡 コンテキスト圧縮の提案
━━━━━━━━━━━━━━━━━━━━━━
ツール呼び出し: 50回
フェーズ: [現在のフェーズ]
━━━━━━━━━━━━━━━━━━━━━━
圧縮前にsession-managerで状態を保存してください。
```

**リマインダースケジュール**:
| 回数 | アクション |
|------|----------|
| 50回 | 圧縮提案 |
| 75回 | リマインダー |
| 100回 | 強い警告 |
| 以降25回ごと | リマインダー |

---

### 2. PostToolUse Hooks (REQ-CO-004)

**WHEN** ファイル編集後（Edit/Write）  
**DO** ファイル種別に応じた自動チェック

| 拡張子 | チェック | コマンド |
|--------|---------|---------|
| `.ts`, `.tsx` | 型チェック | `npx tsc --noEmit` |
| `.ts`, `.tsx`, `.js` | フォーマット | `prettier --check` |
| `.ts`, `.tsx`, `.js` | console.log検出 | `grep -n "console.log"` |

**問題発見時**: ユーザーに報告し、修正を提案

---

### 3. PreToolUse Hooks (REQ-CO-005)

**WHEN** 以下のコマンド実行前  
**DO** 確認/警告を表示

| パターン | アクション |
|---------|----------|
| `npm install`, `pnpm install` | tmux使用を提案 |
| `npm run build`, `cargo build` | バックグラウンド実行を提案 |
| `git push` | 変更差分の最終確認 |
| `rm -rf`, `git reset --hard` | ⚠️ 破壊的操作の警告 |

---

### 4. Doc Blocker (REQ-CO-006)

**WHEN** Markdownファイル作成時  
**DO** 必要性を確認（以下は除外）

**除外リスト**: `README.md`, `CHANGELOG.md`, `LICENSE`, `docs/**`, `.github/**`

---

## 🎯 Context Mode (REQ-CO-003)

**WHEN** `/mode <name>` または モード切り替え要求  
**DO** 対応するコンテキストを注入

| モード | フォーカス | 推奨ツール |
|--------|----------|----------|
| `dev` | 実装・コーディング | Edit, Write, Bash |
| `review` | コードレビュー | Read, Grep, Glob |
| `research` | 調査・探索 | Read, Grep, semantic_search |

**モード切り替え時の出力**:
```
🎯 Mode: [モード名]
━━━━━━━━━━━━━━━━
フォーカス: [説明]
推奨ツール: [ツールリスト]
```

---

## トレーサビリティ

- REQ-CO-001: Strategic Compact Suggestion
- REQ-CO-002: Tool Call Counter
- REQ-CO-003: Context Mode Injection
- REQ-CO-004: PostToolUse Hooks
- REQ-CO-005: PreToolUse Hooks
- REQ-CO-006: Doc Blocker
