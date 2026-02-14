# ADR-0004: Domain Events Pattern for Layer Decoupling

## Status
Accepted

## Context
設計当初、TrackingService（Presentation層）がHoldingsService（Application層）の更新を監視するためにObserver Patternを採用していた。しかし、以下の問題が発生:

- **レイヤー違反リスク**: Application層とPresentation層の双方向依存
- **循環依存**: TrackingService ⇔ HoldingsService
- **疎結合不足**: HoldingsServiceがTrackingServiceの存在を知っている

## Decision
**Domain Events Pattern + EventBus**を採用し、レイヤー間を疎結合化する。

### アーキテクチャ

```
Application Layer (HoldingsService)
    ↓ publishes
EventBus (Infrastructure Layer)
    ↓ notifies
Presentation Layer (TrackingService)
    ↓ subscribes
```

**依存方向**: HoldingsService → EventBus ← TrackingService（一方向のみ）

### 設計

#### 1. Domain Events定義
```typescript
// Domain Layer
interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: DateTime;
  readonly eventType: string;
}

class HoldingsFetchedEvent implements DomainEvent {
  readonly eventType = 'HoldingsFetched';
  
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: DateTime,
    public readonly accountId: AccountId,
    public readonly holdings: Holding[]
  ) {}
}

class HoldingsAggregatedEvent implements DomainEvent {
  readonly eventType = 'HoldingsAggregated';
  
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: DateTime,
    public readonly aggregatedHoldings: AggregatedHolding[]
  ) {}
}

class SnapshotCreatedEvent implements DomainEvent {
  readonly eventType = 'SnapshotCreated';
  
  constructor(
    public readonly eventId: string,
    public readonly occurredAt: DateTime,
    public readonly snapshot: Snapshot
  ) {}
}
```

#### 2. EventBus (Infrastructure)
```typescript
interface IEventBus {
  publish<T extends DomainEvent>(event: T): void;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): Subscription;
  unsubscribe(subscription: Subscription): void;
}

class EventBus implements IEventBus {
  private handlers = new Map<string, Set<Function>>();
  
  publish<T extends DomainEvent>(event: T): void {
    const handlers = this.handlers.get(event.eventType);
    if (!handlers) return;
    
    for (const handler of handlers) {
      // 非同期実行（発行側をブロックしない）
      Promise.resolve(handler(event)).catch(err => {
        // エラーハンドリング + AuditServiceにログ
        console.error('Event handler failed:', err);
      });
    }
  }
  
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    return { eventType, handler };
  }
  
  unsubscribe(subscription: Subscription): void {
    const handlers = this.handlers.get(subscription.eventType);
    handlers?.delete(subscription.handler);
  }
}
```

#### 3. Publisher側（HoldingsService）
```typescript
class HoldingsService {
  constructor(
    private readonly eventBus: IEventBus,
    // ...other dependencies
  ) {}
  
  async fetchHoldings(accountId: AccountId): Promise<Result<Holding[], Error>> {
    // データ取得ロジック...
    const holdings = await this.fetchFromAdapter(accountId);
    
    // イベント発行（TrackingServiceの存在を知らない）
    this.eventBus.publish(new HoldingsFetchedEvent(
      generateId(),
      DateTime.now(),
      accountId,
      holdings
    ));
    
    return Result.ok(holdings);
  }
}
```

#### 4. Subscriber側（TrackingService）
```typescript
class TrackingService {
  private subscription: Subscription | null = null;
  
  constructor(
    private readonly eventBus: IEventBus,
    private readonly snapshotRepo: IWriteRepository<Snapshot>
  ) {
    this.setupSubscriptions();
  }
  
  private setupSubscriptions(): void {
    // HoldingsFetchedEventを購読
    this.subscription = this.eventBus.subscribe(
      'HoldingsFetched',
      async (event: HoldingsFetchedEvent) => {
        await this.recordSnapshot(event.holdings);
      }
    );
  }
  
  private async recordSnapshot(holdings: Holding[]): Promise<void> {
    const snapshot = Snapshot.create(holdings);
    await this.snapshotRepo.save(snapshot);
  }
  
  dispose(): void {
    if (this.subscription) {
      this.eventBus.unsubscribe(this.subscription);
    }
  }
}
```

## Consequences

### Positive
- **レイヤー分離**: Application層がPresentation層に依存しない
- **疎結合**: HoldingsServiceはTrackingServiceの存在を知らない
- **拡張性**: 新しいSubscriberを追加しても既存コード変更不要（OCP準拠）
- **テスタビリティ**: EventBusをモック化して単体テスト可能
- **監査ログ**: EventBus経由で全イベントをAuditServiceに記録可能

### Negative
- **複雑性**: 直接呼び出しよりも間接的
- **デバッグ**: イベントフローの追跡が若干困難
- **非同期処理**: イベントハンドラのエラーハンドリング必須

### Trade-offs
- **即時性 vs 疎結合**: イベントは非同期実行（即時反映は保証されない）
  - **軽減策**: UIには楽観的更新（Optimistic UI）を適用

## Alternatives Considered

### 1. 直接的なObserver Pattern
- **却下理由**: TrackingServiceとHoldingsServiceの双方向依存
- レイヤー違反

### 2. Mediator Pattern
- **検討**: EventBusと似ているが、Mediatorは集中管理的
- **却下理由**: ドメインイベントの概念を明示したい

### 3. Reactive Streams (RxJS)
- **検討**: 強力だが学習コスト高い
- **却下理由**: シンプルなEventBusで十分

## Implementation Notes

### イベント命名規則
- 過去形で命名: `HoldingsFetched`, `AccountCreated`, `SnapshotRecorded`
- ドメイン概念を反映: ビジネス用語を使用

### エラーハンドリング
```typescript
// EventBus内でエラーをキャッチ
this.eventBus.subscribe('HoldingsFetched', async (event) => {
  try {
    await this.recordSnapshot(event.holdings);
  } catch (error) {
    // AuditServiceにログ + ユーザーに通知（必要に応じて）
    this.auditService.logError(error);
  }
});
```

### テスト戦略
```typescript
// EventBusのモック
class MockEventBus implements IEventBus {
  publishedEvents: DomainEvent[] = [];
  
  publish<T extends DomainEvent>(event: T): void {
    this.publishedEvents.push(event);
  }
  
  // テストでイベント発行を検証
  assertEventPublished(eventType: string): void {
    const found = this.publishedEvents.some(e => e.eventType === eventType);
    if (!found) throw new Error(`Event ${eventType} not published`);
  }
}
```

## Related
- DESIGN-資産管理WEBアプリ-001-C4.md: Domain Events Pattern適用箇所
- REQ-013: 履歴保存（TrackingServiceがSnapshotを記録）
- REQ-014: トレンドグラフ（TrackingServiceが表示）

## Date
2026-02-11
