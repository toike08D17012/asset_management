# ADR-0001: 資産管理アプリにレイヤードアーキテクチャとDomain Driven Designを採用

- **Date**: 2026-02-11
- **Status**: accepted

## Context

資産管理WEBアプリの初期設計において、以下の課題が存在しました:

1. **アーキテクチャの不明瞭性**: すべてのサービスがフラットに配置され、レイヤー構造が存在しない
2. **SOLID原則違反**: 特にDependency Inversion Principle (DIP) の違反
3. **ドメインモデルの欠如**: エンティティやValue Objectの定義がなく、ビジネスロジックの所在が不明確
4. **テスタビリティの低下**: Singleton Patternの過剰適用により、単体テストが困難
5. **拡張性の問題**: 新しい証券会社の追加や機能拡張時の影響範囲が不明

これらの問題を解決し、保守性・拡張性・テスタビリティを向上させる必要がありました。

## Decision

**4層のレイヤードアーキテクチャとDomain Driven Design (DDD) を採用します。**

### アーキテクチャ構成

```
Presentation Layer    → UI/グラフ表示/エクスポート
Application Layer     → ユースケース/サービス調整
Domain Layer          → エンティティ/Value Object/ドメインロジック
Infrastructure Layer  → データ永続化/外部API/暗号化
```

### 主要な設計決定

1. **Dependency Injection**: Singletonを廃止し、DIコンテナで依存性管理
2. **Strategy Pattern**: 証券会社別の処理を `IBrokerageAdapter` インターフェースで抽象化
3. **Repository Pattern**: データアクセスを `IDataRepository` で抽象化
4. **Interface Segregation**: 読み取り専用インターフェース（`IAuditReader`）を分離
5. **Value Objects**: Price, Security, Quantity等をイミュータブルなVOとして実装

### 採用パターン

- **Entity**: Account, Holding, Snapshot
- **Value Object**: Price, Security, Quantity, AccountId
- **Aggregate**: HoldingsAggregate (集約ルート)
- **Domain Service**: WeightedAveragePriceCalculator
- **Application Service**: HoldingsService, AccountService

## Consequences

### 👍 Positive

1. **SOLID原則準拠**: すべての原則を遵守し、SOLID検証ツールでクリア
2. **テスタビリティ向上**: 依存性注入により、モックやスタブを使った単体テストが容易
3. **拡張性の向上**: 新しい証券会社追加は `IBrokerageAdapter` 実装のみで可能
4. **保守性の向上**: 責務が明確に分離され、変更の影響範囲を局所化
5. **ドメイン知識の明示化**: エンティティとVOでビジネスルールを型システムで表現
6. **循環依存の排除**: レイヤー間の依存方向が一方向に制限

### 👎 Negative

1. **初期実装コストの増加**: インターフェース定義やDI設定が必要
2. **学習曲線**: DDDの概念理解が必要（ただし長期的にはメリット）
3. **ファイル数の増加**: レイヤー分離により、ファイル・ディレクトリ構造が複雑化

### ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 過度な抽象化 | YAGNI原則を適用、必要最小限のインターフェースから開始 |
| パフォーマンス低下 | 初期はシンプルな実装、ボトルネック発見後に最適化 |
| チーム学習コスト | ドキュメント整備、ペアプログラミング推奨 |

## Related Requirements

- REQ-001: Web統合UI（Presentation Layerで実装）
- REQ-002: データ取得・保存（Repository Patternで実装）
- REQ-008: 暗号化保存（Infrastructure Layerで実装）
- REQ-017: CSV/スクレイピング（Strategy Patternで実装）
- REQ-018: 複数口座集約（Aggregateで実装）
- REQ-019: 加重平均計算（Domain Serviceで実装）

## Implementation Guide

### ディレクトリ構造（推奨）

```
src/
├── domain/
│   ├── entities/          # Account, Holding, Snapshot
│   ├── value-objects/     # Price, Security, Quantity
│   ├── aggregates/        # HoldingsAggregate
│   ├── services/          # WeightedAveragePriceCalculator
│   └── repositories/      # IDataRepository (interface)
├── application/
│   ├── services/          # HoldingsService, AccountService
│   └── use-cases/         # IFetchHoldingsUseCase (interface)
├── infrastructure/
│   ├── repositories/      # DataRepository (implementation)
│   ├── adapters/          # RakutenBrokerageAdapter, SBIBrokerageAdapter
│   ├── encryption/        # EncryptionService
│   └── audit/             # AuditService
└── presentation/
    ├── services/          # TrackingService, ExportService
    └── controllers/       # (Web UIコントローラー)
```

### 実装順序

1. Domain Layer（エンティティ・VO）
2. Infrastructure Layer（Repository実装）
3. Application Layer（サービス・ユースケース）
4. Presentation Layer（UI・コントローラー）

## References

- [DESIGN-資産管理WEBアプリ-001-C4.md](../../storage/specs/DESIGN-資産管理WEBアプリ-001-C4.md)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- MUSUBIX v3.8.2 Constitution (Article I: Library-First, Article VIII: Anti-Abstraction)
