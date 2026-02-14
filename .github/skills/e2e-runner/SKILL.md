---
name: e2e-runner
description: Playwrightを使用してE2Eテストを生成・実行。クリティカルユーザーフローの検証。
license: MIT
version: 1.1.0
triggers:
  - /e2e
  - /playwright
  - E2Eテスト
---

# E2E Runner

> **要約**: PlaywrightでE2Eテストを生成・実行。テスト結果のレポートとスクリーンショット管理。

## 📌 コマンド

| コマンド | 説明 |
|---------|------|
| `/e2e generate <flow>` | テスト生成 |
| `/e2e run [flow]` | テスト実行 |
| `/e2e report` | レポート表示 |

---

## 🎬 テスト生成 (REQ-E2E-001)

**WHEN** `/e2e generate <flow>` 実行  
**DO** テストファイルを生成

**出力構造**:
```
tests/e2e/
├── <flow>.spec.ts     # テストファイル
├── fixtures/
│   └── <flow>.json    # テストデータ
└── pages/
    └── <flow>.page.ts # Page Object
```

**テストテンプレート**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('<Flow>', () => {
  test('should complete flow', async ({ page }) => {
    // Step 1: Navigate
    await page.goto('/');
    
    // Step 2: Action
    await page.click('[data-testid="button"]');
    
    // Step 3: Assert
    await expect(page.locator('.success')).toBeVisible();
  });
});
```

---

## ▶️ テスト実行 (REQ-E2E-002)

**WHEN** `/e2e run [flow]` 実行  
**DO** Playwrightでテスト実行

| オプション | 説明 |
|-----------|------|
| `--headed` | ブラウザ表示 |
| `--debug` | デバッグモード |
| `--trace` | トレース記録 |
| `--browser <name>` | ブラウザ指定 |

```bash
# 全テスト
npx playwright test

# 特定フロー
npx playwright test tests/e2e/login.spec.ts

# デバッグ
npx playwright test --debug
```

---

## 📊 レポート (REQ-E2E-003)

**WHEN** テスト完了  
**DO** レポート生成

```
📊 E2E Test Report
━━━━━━━━━━━━━━━━━━━━━━━━
Total:   10 tests
Passed:  8 ✅
Failed:  2 ❌
Skipped: 0

Duration: 45.2s
━━━━━━━━━━━━━━━━━━━━━━━━

Failed Tests:
1. login.spec.ts > should login
   Error: Timeout waiting for selector
   Screenshot: playwright-report/login-1.png

2. checkout.spec.ts > should pay
   Error: Element not found
   Screenshot: playwright-report/checkout-1.png
```

**HTMLレポート**:
```bash
npx playwright show-report
```

---

## 📁 設定

**playwright.config.ts**:
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

---

## トレーサビリティ

- REQ-E2E-001: E2E Test Generation
- REQ-E2E-002: E2E Test Execution
- REQ-E2E-003: E2E Report
