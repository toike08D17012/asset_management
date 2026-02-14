---
name: musubix-adr-generation
description: Architecture Decision Records作成ガイド。技術選定・設計判断のドキュメント化に使用。
license: MIT
---

# ADR Generation Skill

**Article VIII - Decision Records**に基づきADRを作成。

## WHEN → DO

| WHEN | DO |
|------|-----|
| 技術選定を記録したい | Technology Selection ADRを作成 |
| 設計パターンを決定 | Architecture Pattern ADRを作成 |
| トレードオフを文書化 | 選択肢の比較表を作成 |

## ADR Template

```markdown
# ADR-[NUMBER]: [Decision Title]

## ステータス
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## コンテキスト
[決定の背景・動機]

## 決定
[採用する解決策]

## 選択肢

### Option 1: [Name]
| メリット | デメリット |
|---------|-----------|
| [Advantage] | [Disadvantage] |

## 結果
[この決定による影響]

## トレーサビリティ
- 関連要件: REQ-XXX-NNN
- 関連設計: DES-XXX-NNN
```

## 典型的ADRトピック

| カテゴリ | 例 | 決定ポイント |
|---------|-----|-------------|
| **言語選定** | TypeScript vs Go | 型安全性, エコシステム, 学習曲線 |
| **アーキテクチャ** | Layered vs Hexagonal | チームスキル, 複雑度, テスト容易性 |
| **DB選定** | PostgreSQL vs MongoDB | ACID要件, スキーマ柔軟性 |
| **認証方式** | JWT vs Session | ステートレス要件, セキュリティ |

## CLI

```bash
npx musubix design adr <decision>   # ADR生成
```

## 出力例

```
┌─────────────────────────────────────────┐
│ ADR Generated                           │
├─────────────────────────────────────────┤
│ ID:      ADR-001                        │
│ Title:   Use TypeScript for Backend     │
│ Status:  Proposed                       │
│ Path:    docs/adr/ADR-001.md            │
└─────────────────────────────────────────┘
```
