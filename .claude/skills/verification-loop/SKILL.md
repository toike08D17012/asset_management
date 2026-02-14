---
name: verification-loop
description: 6フェーズ検証ループ（Build→Type→Lint→Test→Security→Diff）でPRレディネスを判定。
license: MIT
version: 1.1.0
triggers:
  - /verify
  - /verify quick
  - PRレビュー前
  - セッション終了
---

# Verification Loop

> **要約**: 6フェーズの総合検証でPRレディネスを判定。quick/fullモードとStop Hook監査をサポート。

## 🔄 /verify コマンド

### Full検証 (REQ-VL-001)

**WHEN** `/verify` 実行  
**DO** 6フェーズを順次実行

| # | フェーズ | コマンド | 失敗時 |
|---|---------|---------|--------|
| 1 | **Build** | `npm run build` | 即停止・修正 |
| 2 | **Type** | `npx tsc --noEmit` | 重大エラー修正 |
| 3 | **Lint** | `npm run lint` | 報告（--fix可） |
| 4 | **Test** | `npm test` | 報告 |
| 5 | **Security** | `npm audit` | 報告 |
| 6 | **Diff** | `git diff --stat` | レビュー |

---

### Quick検証 (REQ-VL-004)

**WHEN** `/verify quick` 実行  
**DO** 最小セットを実行

- Type Check（可能なら）
- Tests（差分関連 or `test:unit`）
- Diff Review（サマリーのみ）

---

## 📋 Verification Report (REQ-VL-002)

```
╔════════════════════════════════════════════╗
║         VERIFICATION REPORT                ║
╠════════════════════════════════════════════╣
║  Build:     [PASS] ✅                      ║
║  Types:     [PASS] ✅ (0 errors)           ║
║  Lint:      [PASS] ⚠️ (3 warnings)         ║
║  Tests:     [PASS] ✅ (42/42, 85%)         ║
║  Security:  [PASS] ✅ (0 critical)         ║
║  Diff:      [INFO] 📝 (5 files, +120 -45)  ║
╠════════════════════════════════════════════╣
║  Overall:   [READY] ✅ for PR              ║
╚════════════════════════════════════════════╝
```

**NOT READY時**:
```
Issues to Fix:
1. src/user.ts:45 - Type error TS2322
2. tests/api.test.ts - 2 failed tests
```

---

## ⏱️ Continuous Verification (REQ-VL-003)

**WHEN** 長時間セッション（15分以上）または大きな変更後  
**DO** 自動検証を提案

```
💡 検証を実行しますか？
最後の検証から15分経過しました。
```

---

## 🔍 Stop Hook監査 (REQ-VL-005)

**WHEN** セッション終了  
**DO** 編集ファイルに対して監査

| チェック | 対象 | アクション |
|---------|------|----------|
| `console.log` | `.ts`, `.tsx`, `.js` | 警告 |
| `debugger` | `.ts`, `.tsx`, `.js` | 警告 |
| TODO/FIXME | 全ファイル | リスト化 |
| 未コミット | Git管理 | コミット提案 |

**検出コマンド**:
```bash
grep -rn "console.log\|debugger" --include="*.ts" --include="*.tsx" src/
grep -rn "TODO\|FIXME" --include="*.ts" src/
git status --short
```

---

## トレーサビリティ

- REQ-VL-001: Multi-Phase Verification
- REQ-VL-002: Verification Report
- REQ-VL-003: Continuous Verification
- REQ-VL-004: Verification Modes
- REQ-VL-005: Stop Hook監査
