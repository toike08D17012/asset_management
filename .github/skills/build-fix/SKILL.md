---
name: build-fix
description: ビルドエラーを分析し、反復的に修正。TypeScript/ESLint/依存関係エラーに対応。
license: MIT
version: 1.1.0
triggers:
  - ビルドエラー発生
  - /build-fix
  - npm run build 失敗
---

# Build Fix

> **要約**: ビルドエラーを自動分類し、反復的な修正戦略で段階的に解決。

## 🔍 エラー分析 (REQ-BF-001)

**WHEN** ビルドエラー発生  
**DO** カテゴリ分類と優先度付け

| カテゴリ | 例 | 優先度 |
|---------|-----|--------|
| **Type Error** | TS2322, TS2339 | 🔴 高 |
| **Import Error** | Module not found | 🔴 高 |
| **Syntax Error** | Unexpected token | 🔴 高 |
| **Lint Error** | ESLint errors | 🟡 中 |
| **Config Error** | tsconfig, webpack | 🟡 中 |
| **Dependency** | Version mismatch | 🟢 低 |

### 分析出力

```
🔍 Build Error Analysis
━━━━━━━━━━━━━━━━━━━━━━
Total: 8 errors

By Category:
  🔴 Type Error:   4 (High)
  🔴 Import Error: 2 (High)
  🟡 Lint Error:   2 (Medium)

Root Cause:
  1. src/user.ts:45 - Missing 'email' property
     → Causes 2 downstream errors

Fix Order:
  1. src/user.ts:45 (root cause)
  2. Remaining may resolve automatically
```

---

## 🔄 修正ループ (REQ-BF-002)

**WHILE** ビルドエラーが存在 (最大10回)  
**DO** 以下のループを実行

```
1. エラーリスト取得
   ↓
2. Root Cause特定（影響範囲最大のエラー）
   ↓
3. 修正適用（1エラーに集中）
   ↓
4. ビルド再実行
   ↓
5. 結果確認
   ↓
エラーあり → 1へ戻る
```

### 優先順位

1. **Root Cause First** - 連鎖エラーの根本原因
2. **Import/Module First** - コンパイル阻害要因
3. **Type Errors** - 下流エラーの原因
4. **Syntax Errors** - 局所的だが致命的
5. **Lint Errors** - 最後に対応

---

## 📋 TypeScriptエラーリファレンス

| コード | 説明 | 解決策 |
|--------|------|--------|
| TS2322 | Type not assignable | 型の修正/アサーション |
| TS2339 | Property not exist | プロパティ追加/型定義修正 |
| TS2345 | Argument mismatch | 引数の型修正 |
| TS2304 | Cannot find name | import追加/定義追加 |
| TS2307 | Module not found | パス修正/インストール |
| TS2531 | Possibly null | nullチェック追加 |

---

## 📊 Fix Report (REQ-BF-003)

**WHEN** 修正完了  
**DO** レポート生成

```
🔧 Build Fix Report
━━━━━━━━━━━━━━━━━━━━━━━━
Iterations: 2
Errors Fixed: 8

Changes:
  • src/user.ts (+5 -2)
  • tsconfig.json (+1 -0)

Progress:
  Iteration 1: 8 → 4 errors
  Iteration 2: 4 → 0 errors

Status: ✅ Build successful
Remaining Warnings: 3
```

---

## トレーサビリティ

- REQ-BF-001: Build Error Analysis
- REQ-BF-002: Iterative Fix Strategy
- REQ-BF-003: Fix Report
