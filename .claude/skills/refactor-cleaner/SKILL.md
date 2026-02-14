---
name: refactor-cleaner
description: デッドコード検出・安全な削除。knip/depcheck/ts-pruneと連携。
license: MIT
version: 1.1.0
triggers:
  - /refactor
  - /cleanup
  - /deadcode
---

# Refactor Cleaner

> **要約**: デッドコードを検出し、安全に削除。すべての削除操作をログに記録。

## 📌 コマンド

| コマンド | 説明 |
|---------|------|
| `/refactor analyze` | デッドコード検出 |
| `/refactor clean [--safe-only]` | 安全な削除 |
| `/refactor report` | レポート表示 |

---

## 🔍 検出ツール (REQ-RC-001)

| ツール | 検出内容 | コマンド |
|--------|---------|---------|
| **knip** | 未使用ファイル/エクスポート/依存 | `npx knip` |
| **depcheck** | 未使用npm依存 | `npx depcheck` |
| **ts-prune** | 未使用TSエクスポート | `npx ts-prune` |

---

## ⚠️ 安全な削除 (REQ-RC-002)

**BEFORE** 削除実行  
**DO** 以下を検証

| チェック | コマンド |
|---------|---------|
| 動的インポート | `grep -rn "import(" src/` |
| テスト参照 | `grep -rn "<name>" tests/` |
| ドキュメント参照 | `grep -rn "<name>" docs/` |

**検出された場合**: 削除対象から除外

---

## 📊 リスク分類 (REQ-RC-004)

| レベル | 説明 | アクション |
|--------|------|----------|
| 🟢 **SAFE** | 静的解析で参照なし | 自動削除可 |
| 🟡 **CAUTION** | 動的参照の可能性 | 確認必要 |
| 🔴 **DANGER** | 公開API/エントリーポイント | 自動削除禁止 |

**出力例**:
```
🔍 Dead Code Analysis
━━━━━━━━━━━━━━━━━━━━━━━━
🟢 SAFE (5):
  • src/utils/deprecated.ts
  • src/helpers/old.ts

🟡 CAUTION (2):
  • src/lib/maybe-used.ts

🔴 DANGER (1):
  • src/index.ts (entry point)
━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 Deletion Log (REQ-RC-003)

**WHEN** コード削除  
**DO** `docs/DELETION_LOG.md`に記録

```markdown
## [日付]

### Deleted
- `src/utils/deprecated.ts`
- `src/helpers/old.ts`

### Reason
knip検出: 未使用エクスポート

### Restore
`git checkout abc1234 -- <file>`
```

**レポート保存**: `.reports/dead-code-analysis.md`

---

## トレーサビリティ

- REQ-RC-001: Dead Code Detection
- REQ-RC-002: Safe Deletion
- REQ-RC-003: Deletion Log
- REQ-RC-004: Risk Classification
