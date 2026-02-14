---
name: musubix-best-practices
description: MUSUBIX学習済み17ベストプラクティスガイド。コード・設計・テストパターンの適用に使用。
license: MIT
---

# Best Practices Skill

14以上のプロジェクトから学習した17のベストプラクティス。

## Code Patterns (5)

| ID | パターン | 概要 |
|----|---------|------|
| BP-CODE-001 | Entity Input DTO | 複数パラメータ→DTOオブジェクト |
| BP-CODE-002 | Date-based ID | `PREFIX-YYYYMMDD-NNN`形式 |
| BP-CODE-003 | Value Objects | ドメイン概念にVO使用 |
| BP-CODE-004 | Function-based VO | interface + factory関数（classは非推奨） |
| BP-CODE-005 | Result Type | `Result<T, E>`で失敗を表現 |

### BP-CODE-004: Function-based VO

```typescript
// ✅ 推奨
interface Price { readonly amount: number; readonly currency: 'JPY'; }
function createPrice(amount: number): Result<Price, ValidationError> {
  if (amount < 100) return err(new ValidationError('...'));
  return ok({ amount, currency: 'JPY' });
}

// ❌ 非推奨: class-based
```

## Design Patterns (7)

| ID | パターン | 概要 |
|----|---------|------|
| BP-DESIGN-001 | Status Transition Map | `Record<Status, Status[]>`で遷移定義 |
| BP-DESIGN-002 | Repository Async | 将来DB移行に備えてasync化 |
| BP-DESIGN-003 | Service Layer DI | リポジトリをDI |
| BP-DESIGN-004 | Optimistic Locking | versionフィールドで同時編集検出 |
| BP-DESIGN-005 | AuditService | データ変更の監査ログ |
| BP-DESIGN-006 | Entity Counter Reset | テスト用resetXxxCounter() |
| BP-DESIGN-007 | Expiry Time Logic | expiresAtで有効期限管理 |

### BP-DESIGN-001: Status Transition Map

```typescript
const validTransitions: Record<Status, Status[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [], cancelled: [],
};
```

## Test Patterns (5)

| ID | パターン | 概要 |
|----|---------|------|
| BP-TEST-001 | Counter Reset | beforeEachでIDカウンターリセット |
| BP-TEST-002 | Verify API | テスト前にAPIシグネチャ確認 |
| BP-TEST-003 | Vitest ESM | Vitest + TypeScript ESM構成 |
| BP-TEST-004 | Result Type Test | isOk()/isErr()で両ケーステスト |
| BP-TEST-005 | Status Transition | 有効・無効遷移を網羅テスト |

## CLI

```bash
npx musubix learn best-practices               # 全パターン表示
npx musubix learn best-practices --category code
npx musubix learn best-practices --high-confidence
```

## 出力例

```
┌────────────────────────────────────────────────┐
│ Best Practices Applied                         │
├────────────────────────────────────────────────┤
│ Code Patterns:   5 applied                     │
│ Design Patterns: 7 applied                     │
│ Test Patterns:   5 applied                     │
│ Confidence:      95% average                   │
└────────────────────────────────────────────────┘
```
