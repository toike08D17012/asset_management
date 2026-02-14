# ADR-0002: Brokerage Adapter Factory Pattern

## Status
Accepted

## Context
証券会社（楽天証券、SBI証券）ごとに異なるデータ取得方法が必要であり、将来的に新しい証券会社の追加が見込まれる。各証券会社のアダプター実装を動的に選択・生成する仕組みが必要。

## Decision
Strategy PatternとFactory Patternを組み合わせた `BrokerageAdapterFactory` を採用する。

### 設計

```typescript
// Strategy Interface
interface IBrokerageAdapter {
  readonly brokerage: Brokerage;
  fetchHoldings(credentials: Credentials): Promise<Result<RawHolding[], FetchError>>;
  validateCredentials(credentials: Credentials): Result<void, ValidationError>;
}

// Concrete Strategies
class RakutenBrokerageAdapter implements IBrokerageAdapter {
  readonly brokerage = 'rakuten' as const;
  // 実装...
}

class SBIBrokerageAdapter implements IBrokerageAdapter {
  readonly brokerage = 'sbi' as const;
  // 実装...
}

// Factory
class BrokerageAdapterFactory {
  private adapters = new Map<Brokerage, IBrokerageAdapter>();
  
  constructor() {
    // 初期登録
    this.register('rakuten', new RakutenBrokerageAdapter());
    this.register('sbi', new SBIBrokerageAdapter());
  }
  
  register(brokerage: Brokerage, adapter: IBrokerageAdapter): void {
    if (adapter.brokerage !== brokerage) {
      throw new Error('Adapter brokerage mismatch');
    }
    this.adapters.set(brokerage, adapter);
  }
  
  create(brokerage: Brokerage): Result<IBrokerageAdapter, Error> {
    const adapter = this.adapters.get(brokerage);
    if (!adapter) {
      return Result.err(new Error(`Unsupported brokerage: ${brokerage}`));
    }
    return Result.ok(adapter);
  }
}
```

### 使用例

```typescript
class HoldingsService {
  constructor(
    private readonly adapterFactory: BrokerageAdapterFactory,
    // ...other dependencies
  ) {}
  
  async fetchHoldings(accountId: AccountId): Promise<Result<Holding[], Error>> {
    const account = await this.accountRepo.findById(accountId);
    const adapterResult = this.adapterFactory.create(account.brokerage);
    
    if (adapterResult.isErr()) {
      return Result.err(adapterResult.error);
    }
    
    const adapter = adapterResult.value;
    return await adapter.fetchHoldings(account.credentials);
  }
}
```

## Consequences

### Positive
- **Open/Closed Principle準拠**: 新規証券会社追加時、既存コード変更不要
- **単一責任**: Factory が生成ロジック、Adapter がデータ取得ロジックを分離
- **テスタビリティ**: モックアダプターを簡単に登録可能
- **型安全性**: TypeScriptの型システムで証券会社タイプを保証

### Negative
- **初期コスト**: Factoryクラスの追加実装が必要
- **間接化**: 直接インスタンス化よりも1層深い

### Risks
- Factoryへの登録忘れ → 起動時の初期化テストで検出
- Adapter実装のバグ → 各Adapterの統合テスト必須

## Related
- REQ-017: CSV/スクレイピングによるデータ取得
- DESIGN-資産管理WEBアプリ-001-C4.md: Strategy Pattern適用箇所

## Date
2026-02-11
