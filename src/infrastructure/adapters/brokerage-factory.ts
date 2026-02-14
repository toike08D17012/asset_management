// ============================================================
// BrokerageAdapterFactory
// ADR-0002: Factory Pattern for adapter creation
// ============================================================

import { type Brokerage, Brokerage as BrokerageEnum, type Result, ok, err } from "@/domain/types";
import type { IBrokerageAdapter } from "./brokerage-adapter";
import { RakutenBrokerageAdapter } from "./rakuten-adapter";
import { SBIBrokerageAdapter } from "./sbi-adapter";

export class BrokerageAdapterFactory {
  private adapters = new Map<Brokerage, IBrokerageAdapter>();

  constructor() {
    // Register default adapters
    this.register(BrokerageEnum.RAKUTEN, new RakutenBrokerageAdapter());
    this.register(BrokerageEnum.SBI, new SBIBrokerageAdapter());
  }

  register(brokerage: Brokerage, adapter: IBrokerageAdapter): void {
    this.adapters.set(brokerage, adapter);
  }

  create(brokerage: Brokerage): Result<IBrokerageAdapter> {
    const adapter = this.adapters.get(brokerage);
    if (!adapter) {
      return err(
        new Error(`No adapter registered for brokerage: ${brokerage}`)
      );
    }
    return ok(adapter);
  }

  listSupported(): Brokerage[] {
    return Array.from(this.adapters.keys());
  }
}

// Singleton instance
let _factory: BrokerageAdapterFactory | null = null;

export function getBrokerageAdapterFactory(): BrokerageAdapterFactory {
  if (!_factory) {
    _factory = new BrokerageAdapterFactory();
  }
  return _factory;
}
