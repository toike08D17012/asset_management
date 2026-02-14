# Regression Eval Examples

## Example 1: User Service Regression

```markdown
[REGRESSION EVAL: user-service]

Baseline: abc1234 (v3.6.0 release)
Date: 2026-01-25

Tests:
  - user.create.test.ts: PASS
  - user.update.test.ts: PASS
  - user.delete.test.ts: FAIL
  - user.search.test.ts: PASS
  - user.auth.test.ts: PASS

Result: 4/5 passed (previously 5/5)

Regression Detected: Yes

Failed Test Details:
  - user.delete.test.ts:
    - Error: "ValidationError: Cannot delete user with active sessions"
    - Line: 45
    - Expected: 204 No Content
    - Actual: 400 Bad Request

Root Cause:
  - 新しいバリデーションルールが追加され、アクティブセッションを持つユーザーの削除が禁止された

Resolution:
  - [ ] テストを更新して新しい挙動を反映
  - [ ] または、バリデーションルールの見直し

Notes:
  - この変更は意図的なセキュリティ強化
  - テストケースの更新が必要
```

---

## Example 2: API Endpoint Regression

```markdown
[REGRESSION EVAL: api-endpoints]

Baseline: def5678 (v3.5.0 release)
Date: 2026-01-25

Tests:
  - api.auth.test.ts: PASS
  - api.users.test.ts: PASS
  - api.products.test.ts: PASS
  - api.orders.test.ts: PASS
  - api.payments.test.ts: PASS

Result: 5/5 passed (previously 5/5)

Regression Detected: No

Performance Comparison:
  | Endpoint      | Baseline | Current | Change |
  |---------------|----------|---------|--------|
  | GET /users    | 45ms     | 42ms    | -6.7%  |
  | POST /orders  | 120ms    | 115ms   | -4.2%  |
  | GET /products | 30ms     | 28ms    | -6.7%  |

Notes:
  - パフォーマンスの改善を確認
  - 機能的な回帰なし
```

---

## Example 3: Database Migration Regression

```markdown
[REGRESSION EVAL: database-schema]

Baseline: ghi9012 (pre-migration)
Date: 2026-01-25

Tests:
  - migration.up.test.ts: PASS
  - migration.down.test.ts: PASS
  - schema.integrity.test.ts: FAIL
  - data.consistency.test.ts: PASS
  - index.performance.test.ts: PASS

Result: 4/5 passed (previously 5/5)

Regression Detected: Yes

Failed Test Details:
  - schema.integrity.test.ts:
    - Error: "Foreign key constraint violation"
    - Table: orders
    - Constraint: fk_orders_users
    - Reason: 孤立したorder レコードが存在

Root Cause:
  - マイグレーション前に外部キー制約がなかったため、不整合データが存在
  - マイグレーションで制約を追加したことで検出

Resolution:
  - [x] 不整合データのクリーンアップスクリプトを実行
  - [x] 制約を段階的に適用（まずソフト制約、その後ハード制約）
  - [ ] データ検証の自動化テストを追加

Notes:
  - 本番環境適用前にデータクリーンアップが必須
```

---

## Example 4: Frontend Component Regression

```markdown
[REGRESSION EVAL: ui-components]

Baseline: jkl3456 (design-system-v2)
Date: 2026-01-25

Tests:
  - button.visual.test.ts: PASS
  - input.visual.test.ts: PASS
  - modal.visual.test.ts: FAIL
  - table.visual.test.ts: PASS
  - form.visual.test.ts: PASS
  - navigation.visual.test.ts: PASS

Result: 5/6 passed (previously 6/6)

Regression Detected: Yes

Failed Test Details:
  - modal.visual.test.ts:
    - Error: "Visual diff exceeded threshold (15% vs 5% allowed)"
    - Screenshot: .reports/screenshots/modal-diff.png
    - Affected area: Close button position

Root Cause:
  - Flexboxのalign-items変更によりボタン位置が変化

Resolution:
  - [ ] CSSの修正
  - [ ] または、ベースライン画像の更新（意図的変更の場合）

Notes:
  - デザインチームに確認が必要
```

---

## Example 5: Security Regression

```markdown
[REGRESSION EVAL: security-scan]

Baseline: mno7890 (security-audit-q4)
Date: 2026-01-25

Tests:
  - auth.security.test.ts: PASS
  - xss.prevention.test.ts: PASS
  - csrf.protection.test.ts: PASS
  - sql.injection.test.ts: PASS
  - dependency.audit.test.ts: FAIL

Result: 4/5 passed (previously 5/5)

Regression Detected: Yes

Failed Test Details:
  - dependency.audit.test.ts:
    - Error: "2 high severity vulnerabilities found"
    - Packages:
      1. lodash@4.17.20 → CVE-2021-23337 (Prototype Pollution)
      2. axios@0.21.0 → CVE-2021-3749 (ReDoS)

Resolution:
  - [x] lodash を 4.17.21 に更新
  - [x] axios を 0.21.4 に更新
  - [x] npm audit を再実行して確認

Notes:
  - 依存関係の自動更新を検討
  - Dependabotの設定を確認
```

---

## Template for New Regression Eval

```markdown
[REGRESSION EVAL: <feature-name>]

Baseline: <Git SHA または チェックポイント名> (<説明>)
Date: YYYY-MM-DD

Tests:
  - <test-file-1>: <PASS|FAIL>
  - <test-file-2>: <PASS|FAIL>
  - <test-file-3>: <PASS|FAIL>
  - <test-file-4>: <PASS|FAIL>

Result: X/Y passed (previously Y/Y)

Regression Detected: <Yes|No>

Failed Test Details (if any):
  - <test-file>:
    - Error: "<エラーメッセージ>"
    - Line: <行番号>
    - Expected: <期待値>
    - Actual: <実際の値>

Root Cause:
  - <回帰の原因分析>

Resolution:
  - [ ] <解決策1>
  - [ ] <解決策2>

Notes:
  - <追加の注記>
```
