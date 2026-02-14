// ============================================================
// EventBus (Infrastructure Layer)
// ADR-0004: Domain Events Pattern for Layer Decoupling
// ============================================================

import type { DomainEvent } from "@/domain/events";

// Re-export domain events for backward compatibility
export type { DomainEvent, HoldingsFetchedEvent, HoldingsAggregatedEvent } from "@/domain/events";

export type EventHandler<T extends DomainEvent> = (
  event: T
) => void | Promise<void>;

export interface Subscription {
  readonly eventType: string;
  readonly handler: EventHandler<DomainEvent>;
}

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): void;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Subscription;
  unsubscribe(subscription: Subscription): void;
}

// --- EventBus Implementation ---

class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler<DomainEvent>>>();

  publish<T extends DomainEvent>(event: T): void {
    const eventHandlers = this.handlers.get(event.eventType);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(
            `EventBus handler error for ${event.eventType}:`,
            error
          );
        }
      }
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler<DomainEvent>);
    return { eventType, handler: handler as EventHandler<DomainEvent> };
  }

  unsubscribe(subscription: Subscription): void {
    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      handlers.delete(subscription.handler as EventHandler<DomainEvent>);
    }
  }
}

// Singleton
let _eventBus: IEventBus | null = null;

export function getEventBus(): IEventBus {
  if (!_eventBus) {
    _eventBus = new InMemoryEventBus();
  }
  return _eventBus;
}
