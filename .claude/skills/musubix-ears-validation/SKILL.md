---
name: musubix-ears-validation
description: EARS形式要件の検証・作成ガイド。要件記述・構文検証に使用。
license: MIT
---

# EARS Validation Skill

EARS (Easy Approach to Requirements Syntax) で要件を形式化・検証。

## EARS Patterns

| パターン | 構文 | 用途 |
|---------|------|------|
| **Ubiquitous** | `THE [system] SHALL [requirement]` | 常に満たす要件 |
| **Event-driven** | `WHEN [event], THE [system] SHALL [response]` | イベント発生時 |
| **State-driven** | `WHILE [state], THE [system] SHALL [behavior]` | 特定状態中 |
| **Unwanted** | `THE [system] SHALL NOT [behavior]` | 禁止事項 |
| **Optional** | `IF [cond], THEN THE [system] SHALL [response]` | 条件付き |

## WHEN → DO

| WHEN | DO |
|------|-----|
| 自然言語の要件 | EARS形式に変換 |
| 要件レビュー | 6項目チェックリスト実施 |
| 要件文書作成 | テンプレートに従って記述 |

## Validation Checklist

- [ ] **Pattern Compliance**: 5パターンのいずれかに準拠
- [ ] **System Name**: システム名が明確
- [ ] **SHALL Keyword**: 必須要件に「SHALL」使用
- [ ] **Measurable**: テスト可能・測定可能
- [ ] **Atomic**: 単一の要件を記述
- [ ] **No Ambiguity**: 曖昧な表現がない

## Conversion Examples

| 自然言語 | EARS形式 |
|---------|---------|
| ユーザーがログインできる | `THE AuthModule SHALL authenticate users with valid credentials.` |
| パスワードが間違っている時エラー表示 | `WHEN invalid credentials are provided, THE AuthModule SHALL display an error.` |
| SQLインジェクションを許可しない | `THE InputValidator SHALL NOT accept SQL injection patterns.` |

## Priority Levels

| 優先度 | 説明 | 用途 |
|--------|------|------|
| **P0** | 必須 | リリースブロッカー |
| **P1** | 重要 | 可能な限り実装 |
| **P2** | 任意 | 時間があれば |

## CLI

```bash
npx musubix requirements validate <file>  # EARS検証
npx musubix requirements analyze <file>   # 自然言語→EARS変換
npx musubix requirements map <file>       # オントロジーマッピング
```

## 出力例

```
┌─────────────────────────────────────────┐
│ EARS Validation Result                  │
├─────────────────────────────────────────┤
│ Requirements: 5 validated               │
│ ✅ Ubiquitous:   2 passed               │
│ ✅ Event-driven: 2 passed               │
│ ✅ Unwanted:     1 passed               │
│ Issues: 0                               │
└─────────────────────────────────────────┘
```
