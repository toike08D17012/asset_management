// ============================================================
// HoldingsService (Application Layer)
// REQ-001, REQ-002, REQ-017, REQ-018, REQ-019
// ============================================================

import {
  type AccountId,
  type Result,
  createHoldingId,
  createAccountId,
  ok,
  err,
} from "@/domain/types";
import type { Holding, AggregatedHolding } from "@/domain/entities/holding";
import { createHolding } from "@/domain/entities/holding";
import type { RawHolding } from "@/infrastructure/adapters/brokerage-adapter";
import type { IHoldingRepository, IAccountRepository } from "@/domain/repositories";
import { getBrokerageAdapterFactory } from "@/infrastructure/adapters/brokerage-factory";
import { calculateWeightedAveragePrice } from "@/domain/services/weighted-average-calculator";
import { getEventBus } from "@/infrastructure/event-bus";
import type { HoldingsFetchedEvent, HoldingsAggregatedEvent } from "@/infrastructure/event-bus";
import { toErrorMessage } from "@/lib/errors";
import { getMutualFundDivisor } from "@/lib/format";
import { v4 as uuidv4 } from "uuid";

export class HoldingsService {
  constructor(
    private readonly holdingRepo: IHoldingRepository,
    private readonly accountRepo: IAccountRepository,
  ) {}

  /**
   * CSVデータから保有証券をインポートする
   */
  async importFromCSV(
    accountId: string,
    csvContent: string
  ): Promise<Result<Holding[]>> {
    // Get account
    const accountResult = await this.accountRepo.findById(accountId);
    if (!accountResult.ok) return accountResult;
    if (!accountResult.value) {
      return err(new Error(`Account not found: ${accountId}`));
    }

    const account = accountResult.value;

    // Get appropriate adapter
    const factory = getBrokerageAdapterFactory();
    const adapterResult = factory.create(account.brokerage);
    if (!adapterResult.ok) return adapterResult;

    // Parse CSV
    const parseResult = adapterResult.value.parseCSV(csvContent);
    if (!parseResult.ok) return parseResult;

    // Delete existing holdings for this account
    await this.holdingRepo.deleteByAccountId(account.id);

    // Convert raw holdings to domain entities
    const holdings: Holding[] = [];
    for (const raw of parseResult.value) {
      const holdingResult = createHolding({
        accountId: account.id,
        security: {
          ticker: raw.ticker,
          name: raw.name,
          type: raw.securityType,
          currency: raw.currency,
        },
        quantity: {
          value: raw.quantity,
          unit: raw.quantityUnit,
        },
        averagePurchasePrice: {
          amount: raw.averagePurchasePrice,
          currency: raw.currency,
        },
        currentPrice: {
          amount: raw.currentPrice,
          currency: raw.currency,
        },
      });

      if (holdingResult.ok) {
        holdings.push(holdingResult.value);
      }
    }

    // Save all holdings
    const saveResult = await this.holdingRepo.saveMany(holdings);
    if (!saveResult.ok) return saveResult;

    // Update account sync timestamp
    await this.accountRepo.updateLastSyncedAt(account.id);

    // Publish event
    const eventBus = getEventBus();
    eventBus.publish<HoldingsFetchedEvent>({
      eventId: uuidv4(),
      occurredAt: new Date(),
      eventType: "HoldingsFetched",
      accountId: account.id,
      holdingsCount: holdings.length,
    });

    return ok(holdings);
  }

  /**
   * 全保有証券を取得
   */
  async getAllHoldings(): Promise<Result<Holding[]>> {
    return this.holdingRepo.query({});
  }

  /**
   * アカウント別の保有証券を取得
   */
  async getHoldingsByAccount(accountId: string): Promise<Result<Holding[]>> {
    return this.holdingRepo.findByAccountId(createAccountId(accountId));
  }

  /**
   * 同一銘柄を集約 (REQ-018)
   */
  async aggregateHoldings(): Promise<Result<AggregatedHolding[]>> {
    const allResult = await this.holdingRepo.query({});
    if (!allResult.ok) return allResult;

    const holdingsByTicker = new Map<string, Holding[]>();

    for (const holding of allResult.value) {
      const key = `${holding.security.ticker}:${holding.security.currency}`;
      if (!holdingsByTicker.has(key)) {
        holdingsByTicker.set(key, []);
      }
      holdingsByTicker.get(key)!.push(holding);
    }

    const aggregated: AggregatedHolding[] = [];

    for (const [, group] of holdingsByTicker) {
      if (group.length === 0) continue;

      const first = group[0];
      let totalQuantity = 0;
      for (const h of group) {
        totalQuantity += h.quantity.value;
      }

      const weightedPriceResult = calculateWeightedAveragePrice(group);
      const weightedPrice = weightedPriceResult.ok
        ? weightedPriceResult.value
        : first.averagePurchasePrice;

      // Use the most recent current price
      const latestHolding = group.reduce((latest, h) =>
        h.recordedAt > latest.recordedAt ? h : latest
      );

      aggregated.push({
        security: first.security,
        totalQuantity: {
          value: totalQuantity,
          unit: first.quantity.unit,
        },
        weightedAveragePrice: weightedPrice,
        currentPrice: latestHolding.currentPrice,
        holdings: group,
      });
    }

    // Publish event
    const eventBus = getEventBus();
    eventBus.publish<HoldingsAggregatedEvent>({
      eventId: uuidv4(),
      occurredAt: new Date(),
      eventType: "HoldingsAggregated",
      totalSecurities: aggregated.length,
    });

    return ok(aggregated);
  }

  /**
   * ポートフォリオサマリーを計算
   */
  async getPortfolioSummary(): Promise<
    Result<{
      totalValueJPY: number;
      totalValueUSD: number;
      totalCostJPY: number;
      totalCostUSD: number;
      gainLossJPY: number;
      gainLossUSD: number;
      holdingsCount: number;
      accountsCount: number;
    }>
  > {
    const holdingsResult = await this.holdingRepo.query({});
    if (!holdingsResult.ok) return holdingsResult;

    const accountsResult = await this.accountRepo.query({});
    if (!accountsResult.ok) return accountsResult;

    let totalValueJPY = 0;
    let totalValueUSD = 0;
    let totalCostJPY = 0;
    let totalCostUSD = 0;

    for (const h of holdingsResult.value) {
      // 投資信託の基準価額は1万口あたりのため、除数で計算
      const divisor = getMutualFundDivisor(h.security.type);
      const value = (h.quantity.value * h.currentPrice.amount) / divisor;
      const cost = (h.quantity.value * h.averagePurchasePrice.amount) / divisor;

      if (h.security.currency === "JPY") {
        totalValueJPY += value;
        totalCostJPY += cost;
      } else {
        totalValueUSD += value;
        totalCostUSD += cost;
      }
    }

    return ok({
      totalValueJPY,
      totalValueUSD,
      totalCostJPY,
      totalCostUSD,
      gainLossJPY: totalValueJPY - totalCostJPY,
      gainLossUSD: totalValueUSD - totalCostUSD,
      holdingsCount: holdingsResult.value.length,
      accountsCount: accountsResult.value.length,
    });
  }

  /**
   * 全保有証券データを削除
   */
  async clearAllHoldings(): Promise<Result<void>> {
    return this.holdingRepo.deleteAll();
  }
}
