// ============================================================
// Domain Events
// ドメインイベントの型定義（ドメイン層に属する）
// ADR-0004: Domain Events Pattern for Layer Decoupling
// ============================================================

/**
 * 全ドメインイベントの基底インターフェース
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

/**
 * 保有証券取得完了イベント
 */
export interface HoldingsFetchedEvent extends DomainEvent {
  readonly eventType: "HoldingsFetched";
  readonly accountId: string;
  readonly holdingsCount: number;
}

/**
 * 保有証券集約完了イベント
 */
export interface HoldingsAggregatedEvent extends DomainEvent {
  readonly eventType: "HoldingsAggregated";
  readonly totalSecurities: number;
}
