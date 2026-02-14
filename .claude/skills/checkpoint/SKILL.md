---
name: checkpoint
description: セーフポイントの作成・復元・比較。Gitと統合して状態を追跡。
license: MIT
version: 1.1.0
triggers:
  - /checkpoint
  - 危険な操作前
  - マイルストーン達成時
---

# Checkpoint

> **要約**: 開発作業のセーフポイントを提供。作成・復元・比較をサポート。

## 📌 コマンド

### /checkpoint create (REQ-CP-001)

**WHEN** `/checkpoint create <name>` 実行  
**DO** 以下を順次実行

1. Quick検証（`/verify quick`）
2. Git commit/stash作成
3. ログ記録

```bash
# 未コミット変更がある場合
git stash push -m "checkpoint: <name>"
# または
git add -A && git commit -m "checkpoint: <name>"
```

**出力**:
```
📍 Checkpoint: <name>
━━━━━━━━━━━━━━━━━━━━
✅ Verification: PASS
✅ Git: abc1234
✅ Logged
━━━━━━━━━━━━━━━━━━━━
Time: 2026-01-25 14:30
```

---

### /checkpoint verify (REQ-CP-002)

**WHEN** `/checkpoint verify <name>` 実行  
**DO** チェックポイントとの差分を報告

| 項目 | 計算 |
|------|------|
| 変更ファイル数 | `git diff --stat <sha>..HEAD` |
| テスト合格率 | 現在 vs チェックポイント時 |
| カバレッジ | 現在 vs チェックポイント時 |
| ビルド状態 | 現在のビルド結果 |

**出力**:
```
📊 Verify: <name> (abc1234)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Metric   | Checkpoint | Current | Change |
|----------|------------|---------|--------|
| Tests    | 42/42      | 45/45   | +3 ✅  |
| Coverage | 85%        | 87%     | +2% ✅ |
| Build    | PASS       | PASS    | -      |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✅ Quality maintained
```

---

### /checkpoint list (REQ-CP-003)

**WHEN** `/checkpoint list` 実行  
**DO** 全チェックポイントを表示

```
📋 Checkpoints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Name                    | Time       | SHA     |
|-------------------------|------------|---------|
| feature-auth-complete   | 01-25 14:30| abc1234 |
| before-migration        | 01-25 10:00| def5678 |
| fix-123-done            | 01-24 16:45| ghi9012 |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### /checkpoint restore (REQ-CP-004)

**WHEN** `/checkpoint restore <name>` 実行  
**DO** 安全に復元

**復元前チェック**:
- 未コミット変更 → stash/commit確認
- 復元後 → `/verify quick` 提案

---

## 📁 Storage (REQ-CP-005)

| パス | 内容 |
|------|------|
| `~/.musubix/checkpoints/checkpoints.log` | メタデータ |
| 保持数 | 最新10件（超過時は古いものを整理） |

**ログ形式**: `YYYY-MM-DD-HH:MM | <name> | <sha>`

---

## 🏷️ 命名規則

| パターン | 例 |
|---------|-----|
| `feature-<name>-<state>` | `feature-auth-complete` |
| `fix-<issue>-<state>` | `fix-123-done` |
| `before-<action>` | `before-migration` |
| `after-<action>` | `after-refactor` |

---

## トレーサビリティ

- REQ-CP-001: Checkpoint Creation
- REQ-CP-002: Checkpoint Verification
- REQ-CP-003: Checkpoint Listing
- REQ-CP-004: Checkpoint Restore
- REQ-CP-005: Checkpoint Retention & Location
