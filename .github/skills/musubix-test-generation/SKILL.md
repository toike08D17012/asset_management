---
name: musubix-test-generation
description: テストコード生成ガイド。TDD/BDDによるユニット・統合テスト作成に使用。
license: MIT
---

# Test Generation Skill

**Article III - Test-First**: Red-Green-Blue TDDサイクルでテストを生成。

## TDD Cycle

```
🔴 Red (Failing Test) → 🟢 Green (Minimal Code) → 🔵 Blue (Refactor)
```

## Test Categories

| カテゴリ | 目的 | 場所 |
|---------|------|------|
| Unit | 単一コンポーネント | `__tests__/unit/` |
| Integration | 複数コンポーネント連携 | `__tests__/integration/` |
| E2E | フルユーザーフロー | `__tests__/e2e/` |

## WHEN → DO

| WHEN | DO |
|------|-----|
| 機能実装前 | テストを先に書く（Red） |
| テスト失敗 | 最小限のコードで通す（Green） |
| テスト成功 | リファクタリング（Blue） |

## Test Template

```typescript
/**
 * @requirement REQ-XXX-NNN
 * @design DES-XXX-NNN
 */
describe('XxxService', () => {
  let service: XxxService;
  
  beforeEach(() => {
    resetXxxCounter();  // BP-TEST-001
    service = new XxxService(new MockRepository());
  });

  it('should create entity with valid input', async () => {
    const result = await service.create({ name: 'Test' });
    expect(result.isOk()).toBe(true);
  });

  it('should return error for invalid input', async () => {
    const result = await service.create({ name: '' });
    expect(result.isErr()).toBe(true);
  });
});
```

## Best Practices

| ID | パターン | 内容 |
|----|---------|------|
| BP-TEST-001 | Counter Reset | beforeEachでIDカウンターリセット |
| BP-TEST-004 | Result Type | isOk()/isErr()で両ケーステスト |
| BP-TEST-005 | Status Transition | 有効・無効遷移を網羅 |

## CLI

```bash
npx musubix test generate <design-file>  # テスト生成
npm test                                  # 全テスト実行
npx musubix test coverage src/            # カバレッジ計測
```

## 出力例

```
┌─────────────────────────────────────────┐
│ Test Generation Result                  │
├─────────────────────────────────────────┤
│ Source:     DES-AUTH-001               │
│ Unit Tests: 8 generated                 │
│ Coverage:   @requirement tags added     │
│ Patterns:   BP-TEST-001, 004, 005       │
│ Status:     Ready for TDD cycle         │
└─────────────────────────────────────────┘
```
