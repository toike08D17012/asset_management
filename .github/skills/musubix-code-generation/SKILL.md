---
name: musubix-code-generation
description: 設計仕様からコード生成ガイド。実装・機能作成に使用。
license: MIT
---

# Code Generation Skill

設計ドキュメントからコードを生成し、トレーサビリティを維持。

## Supported Languages

| 言語 | 拡張子 | サポート機能 |
|------|--------|-------------|
| TypeScript | `.ts` | フル型サポート |
| JavaScript | `.js` | ES6+ modules |
| Python | `.py` | 型ヒント |
| Java/Go/Rust/C# | 各種 | Interface/Struct生成 |

## WHEN → DO

| WHEN | DO |
|------|-----|
| コード生成前 | DES-*とREQ-*の存在確認 |
| 実装開始 | テスト先行（Article III） |
| コード作成 | @see タグでトレーサビリティ追加 |

## Traceability Comment

```typescript
/**
 * UserService - Handles user operations
 * @see REQ-INT-001 - Neuro-Symbolic Integration
 * @see DES-INT-001 - Integration Layer Design
 */
export class UserService { ... }
```

## Design Pattern Templates

| パターン | 用途 |
|---------|------|
| **Singleton** | グローバルインスタンス管理 |
| **Factory** | 型に応じたオブジェクト生成 |
| **Repository** | データアクセス抽象化 |

### Repository Pattern

```typescript
/** @pattern Repository */
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## CLI

```bash
npx musubix codegen generate <design-file>    # コード生成
npx musubix codegen generate <file> --full-skeleton  # 4ファイル生成
npx musubix codegen generate <file> --with-tests     # テスト付き
npx musubix codegen status <spec>             # ステータス遷移コード
npx musubix codegen status <spec> --enum      # enum型
npx musubix codegen analyze <file>            # 静的解析
npx musubix codegen security <path>           # セキュリティスキャン
```

## Quality Checks (Article IX)

- [ ] No `any` types
- [ ] @see references on all classes/functions
- [ ] Test coverage ≥ 80%
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds

## 出力例

```
┌─────────────────────────────────────────┐
│ Code Generated                          │
├─────────────────────────────────────────┤
│ Source:     DES-AUTH-001               │
│ Files:      4 generated                │
│ Patterns:   Repository, Service        │
│ Coverage:   @see tags added            │
│ Tests:      test stubs generated       │
└─────────────────────────────────────────┘
```
