---
name: learning-hooks
description: セッションから再利用可能なパターンを自動抽出し、学習済みスキルとして保存。
license: MIT
version: 1.1.0
triggers:
  - セッション終了（10メッセージ以上）
  - エラー解決後
  - ユーザー修正後
---

# Learning Hooks

> **要約**: セッションから再利用可能なパターンを自動抽出し、次回以降に活用。

## 🔄 トリガーと即時アクション

### パターン抽出 (REQ-LH-001)

**WHEN** セッション終了時（条件: メッセージ10件以上 AND 15分以上）  
**DO** 以下のパターンを抽出

| タイプ | 説明 | 抽出条件 |
|--------|------|---------|
| `error_resolution` | エラー解決 | エラー→修正→解消の流れ |
| `user_corrections` | ユーザー修正 | AI提案を修正→承認 |
| `workarounds` | 回避策 | ライブラリ既知問題への対処 |
| `debugging_techniques` | デバッグ技法 | 問題調査・解決手法 |
| `project_specific` | プロジェクト固有 | アーキテクチャ、命名規則 |

### 抽出フロー

```
セッション終了 → 条件チェック → 会話分析 → パターン候補 → 信頼度計算(≥0.7) → 保存
```

---

## 📁 Learned Skills Storage (REQ-LH-002)

**保存先**: `~/.musubix/skills/learned/<pattern-name>/SKILL.md`

**フォーマット**:
```markdown
# [パターン名]

**Extracted:** [日付]
**Context:** [適用条件]
**Confidence:** [信頼度]

## Problem
[解決する問題]

## Solution
[パターン/技法/回避策]

## Example
[コード例]

## When to Use
[トリガー条件]
```

---

## 🚫 Pattern Ignore List (REQ-LH-003)

**抽出しない**:
- 単純なタイポ修正
- 一時的な問題の修正
- 外部API障害への対応

---

## 💡 抽出例

### error_resolution
```markdown
# TypeScript TS2322 型不一致の解決

**Problem:** `Type 'string' is not assignable to type 'number'`
**Solution:** 明示的な型変換 `Number(value)` または型ガード追加
**When:** TS2322エラーが発生し、型変換が必要な場合
```

### workaround
```markdown
# Vitest ESMモード設定

**Problem:** ESMモジュールでVitestが動作しない
**Solution:** `vitest.config.ts`に`deps.inline: [...]`を追加
**When:** ESMパッケージをテストする際
```

---

## トレーサビリティ

- REQ-LH-001: Continuous Learning Evaluation
- REQ-LH-002: Learned Skills Storage
- REQ-LH-003: Pattern Ignore List
