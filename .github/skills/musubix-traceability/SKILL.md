---
name: musubix-traceability
description: 要件・設計・コード・テスト間のトレーサビリティ管理ガイド。影響分析・マトリクス作成に使用。
license: MIT
---

# Traceability Skill

**Article V - Traceability**: 100%双方向トレーサビリティを維持。

## Traceability Chain

```
REQ-* ↔ DES-* ↔ TSK-* ↔ Code ↔ Tests
```

## WHEN → DO

| WHEN | DO |
|------|-----|
| 要件作成 | REQ-* IDを付与 |
| 設計作成 | DES-* IDを付与、REQ-*に紐付け |
| タスク作成 | TSK-* IDを付与、DES-*・REQ-*に紐付け |
| コード作成 | @requirement, @design タグ追加 |
| テスト作成 | @requirement, @design タグ追加 |
| 要件変更 | 影響分析を実施 |

## Traceability Matrix

```markdown
| 要件ID | 設計ID | タスクID | コード | テスト |
|--------|--------|---------|--------|--------|
| REQ-AUTH-001 | DES-AUTH-001 | TSK-001 | auth-service.ts | auth.test.ts |
| REQ-AUTH-002 | DES-AUTH-001 | TSK-002 | token-manager.ts | token.test.ts |
```

## Code Traceability

```typescript
/**
 * AuthService - 認証サービス
 * @requirement REQ-AUTH-001
 * @design DES-AUTH-001
 * @task TSK-001
 */
export class AuthService { ... }
```

## Impact Analysis

要件変更時の影響範囲特定:

```
REQ-AUTH-001 変更
    ↓
DES-AUTH-001 (設計)
    ↓
TSK-001, TSK-002 (タスク)
    ↓
auth-service.ts, token-manager.ts (コード)
    ↓
auth.test.ts, token.test.ts (テスト)
```

## Verification Checklist

- [ ] 全要件に設計がリンク
- [ ] 全設計にタスクがリンク
- [ ] 全コードにトレーサビリティコメント
- [ ] 全テストに@requirementタグ

## CLI

```bash
npx musubix trace matrix           # マトリクス生成
npx musubix trace impact REQ-*     # 影響分析
npx musubix trace validate         # リンク検証
npx musubix trace sync             # 自動更新
```

## 出力例

```
┌─────────────────────────────────────────┐
│ Traceability Report                     │
├─────────────────────────────────────────┤
│ Requirements: 5 (100% linked)           │
│ Designs:      3 (100% linked)           │
│ Tasks:        8 (100% linked)           │
│ Code Files:   12 (100% tagged)          │
│ Test Files:   12 (100% tagged)          │
│ Coverage:     100%                      │
└─────────────────────────────────────────┘
```
