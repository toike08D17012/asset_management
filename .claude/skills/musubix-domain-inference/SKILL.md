---
name: musubix-domain-inference
description: 自動ドメイン検出・コンポーネント推論ガイド。プロジェクトドメイン特定に使用。
license: MIT
---

# Domain Inference Skill

**62ドメイン**・**224コンポーネント**を自動検出・推奨。

## Domain Categories

| カテゴリ | ドメイン数 | 例 |
|---------|-----------|-----|
| **Business** | 8 | ecommerce, finance, crm, hr |
| **Healthcare** | 3 | healthcare, pharmacy, veterinary |
| **Service** | 20+ | booking, hotel, restaurant, gym |
| **Technology** | 8 | iot, security, ai, analytics |

## Key Domains

| Domain | 名称 | Key Components |
|--------|------|----------------|
| ecommerce | EC・通販 | CartService, ProductCatalog, OrderProcessor |
| finance | 金融 | AccountService, TransactionManager |
| veterinary | 動物病院 | PetService, VetScheduleService |
| booking | 予約 | ReservationService, SlotManager |
| iot | IoT | DeviceManager, TelemetryProcessor |

## WHEN → DO

| WHEN | DO |
|------|-----|
| 新規プロジェクト開始 | 要件テキストからドメイン検出 |
| 複数ドメインの場合 | primaryとsecondaryを特定 |
| コンポーネント設計 | 推奨コンポーネントを適用 |

## Detection Example

```typescript
const result = domainDetector.detect(`
  ペットの予約管理システム。
  獣医師のスケジュール管理とワクチン接種記録。
`);
// {
//   primaryDomain: { id: 'veterinary' },
//   confidence: 0.92,
//   matchedKeywords: ['ペット', '獣医', 'ワクチン'],
//   suggestedComponents: ['PetService', 'ReservationService']
// }
```

## Architecture by Category

| カテゴリ | アーキテクチャ | スケーリング |
|---------|---------------|-------------|
| Business | Layered + DDD | Vertical + Cache |
| Technology | Microservices | Horizontal |
| Healthcare | Layered + Audit | Vertical + Compliance |

## CLI

```bash
npx musubix design patterns --detect-domain <file>  # ドメイン検出
npx musubix design generate <file> --infer-components  # コンポーネント推論
```

## 出力例

```
┌─────────────────────────────────────────┐
│ Domain Detected                         │
├─────────────────────────────────────────┤
│ Primary:    veterinary (動物病院)       │
│ Confidence: 92%                         │
│ Keywords:   ペット, 獣医, ワクチン      │
│ Components: 5 recommended               │
│ - PetService                            │
│ - ReservationService                    │
│ - VetScheduleService                    │
└─────────────────────────────────────────┘
```
