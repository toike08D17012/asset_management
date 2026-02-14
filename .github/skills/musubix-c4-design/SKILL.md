---
name: musubix-c4-design
description: C4モデル設計ドキュメント作成ガイド。アーキテクチャ図・コンポーネント設計に使用。
license: MIT
---

# C4 Design Skill

C4モデル4レベルでアーキテクチャを構造化。

## C4 Levels

| Level | 名称 | 内容 |
|-------|------|------|
| **1** | Context | システム境界・外部アクター |
| **2** | Container | 技術選択・デプロイ単位 |
| **3** | Component | コンテナ内部構造 |
| **4** | Code | 実装詳細（任意） |

## WHEN → DO

| WHEN | DO |
|------|-----|
| 設計開始前 | `storage/specs/`のREQ-*を確認 |
| 新規システム設計 | Context→Container→Componentの順で作成 |
| コンポーネント追加 | Component Levelを更新 |

## Design Template

```markdown
# DES-[CATEGORY]-[NUMBER]: [Title]

## メタデータ
- 作成日: YYYY-MM-DD
- トレーサビリティ: REQ-XXX-NNN

## 1. Context Level
| アクター | 説明 | インタラクション |
|---------|------|-----------------|
| User | システム利用者 | Web UI経由 |

## 2. Container Level
| コンテナ | 技術 | 責務 |
|---------|------|------|
| Web App | React | UI提供 |
| API | Node.js | ビジネスロジック |
| DB | PostgreSQL | データ永続化 |

## 3. Component Level
| コンポーネント | 種別 | 責務 | 依存先 |
|---------------|------|------|--------|
| XxxService | Service | ビジネスロジック | XxxRepository |
| XxxRepository | Repository | データアクセス | Database |
```

## Design Patterns

| パターン | 用途 | 適用場面 |
|---------|------|---------|
| Repository | データアクセス抽象化 | DB操作 |
| Service | ビジネスロジック集約 | ユースケース |
| Factory | オブジェクト生成 | 複雑な生成 |
| Strategy | アルゴリズム切替 | 認証・計算方式 |

## CLI

```bash
npx musubix design generate <file>    # 設計生成
npx musubix design patterns <context> # パターン検出
npx musubix design c4 <file>          # C4ダイアグラム
npx musubix design traceability       # REQ↔DES検証
```

## 出力例

```
┌─────────────────────────────────────────┐
│ C4 Design Generated                     │
├─────────────────────────────────────────┤
│ Design ID:   DES-SHOP-001              │
│ Containers:  3 (Web, API, DB)          │
│ Components:  8 (Services, Repos)       │
│ Patterns:    Repository, Service       │
│ Traceability: REQ-SHOP-001            │
└─────────────────────────────────────────┘
```
