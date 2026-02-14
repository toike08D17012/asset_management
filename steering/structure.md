# asset_management - Project Structure

## ディレクトリ構成

```
asset_management/
├── steering/                     # プロジェクトメモリ
│   ├── rules/                    # 憲法・ルール
│   ├── product.md                # プロダクトコンテキスト
│   ├── tech.md                   # 技術スタック
│   └── structure.md              # 構造定義
├── storage/                      # データストレージ
│   ├── specs/                    # 仕様書
│   ├── archive/                  # アーカイブ
│   └── changes/                  # 変更履歴
├── docs/adr/                     # Architecture Decision Records
├── src/
│   ├── domain/                   # ドメイン層
│   │   ├── types.ts              # Branded Types, Result, Enums
│   │   ├── entities/             # Account, Holding, Snapshot
│   │   ├── value-objects/        # Price, Security, Quantity
│   │   └── services/             # WeightedAveragePriceCalculator
│   ├── infrastructure/           # インフラ層
│   │   ├── database/             # Drizzle ORM + SQLite
│   │   ├── encryption/           # AES-256-GCM EncryptionService
│   │   ├── repositories/         # Account/Holding/Snapshot Repository
│   │   ├── adapters/             # IBrokerageAdapter + Factory
│   │   └── event-bus.ts          # Domain Events
│   ├── application/              # アプリケーション層
│   │   ├── account-service.ts    # AccountService
│   │   └── holdings-service.ts   # HoldingsService
│   ├── lib/                      # ユーティリティ
│   │   └── service-container.ts  # DI Container
│   ├── components/               # React UIコンポーネント
│   └── app/                      # Next.js App Router
│       └── api/                  # API Routes
├── data/                         # SQLiteデータベース (gitignore)
└── musubix.config.json           # 設定ファイル
```

---

**最終更新**: 2026-02-11
