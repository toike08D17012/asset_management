# Capability Eval Examples

## Example 1: User Authentication Feature

```markdown
[CAPABILITY EVAL: user-authentication]

Task: JWTベースのユーザー認証機能を実装する

Success Criteria:
  - [x] ログインエンドポイントが正常に動作する
  - [x] JWTトークンが正しく生成される
  - [x] トークン検証ミドルウェアが機能する
  - [ ] リフレッシュトークンが実装されている

Expected Output: 
  - POST /api/auth/login → 200 OK + JWT token
  - GET /api/protected → 401 without token, 200 with valid token

Constraints:
  - bcryptを使用したパスワードハッシュ
  - トークン有効期限: 15分
  - リフレッシュトークン有効期限: 7日

Test Command: npm run test:auth

Result: 3/4 criteria met
Status: PARTIAL PASS
```

---

## Example 2: API Rate Limiting

```markdown
[CAPABILITY EVAL: api-rate-limiting]

Task: APIエンドポイントにレート制限を実装する

Success Criteria:
  - [x] IPベースのレート制限が機能する
  - [x] 制限超過時に429エラーを返す
  - [x] X-RateLimit-* ヘッダーが正しく設定される
  - [x] Redis/メモリでの状態管理が動作する
  - [x] ホワイトリストIPが除外される

Expected Output:
  - 正常リクエスト → 200 OK + X-RateLimit-Remaining: 99
  - 制限超過 → 429 Too Many Requests + Retry-After header

Constraints:
  - 制限: 100 requests/minute/IP
  - スライディングウィンドウアルゴリズム

Test Command: npm run test:rate-limit

Result: 5/5 criteria met
Status: PASS
```

---

## Example 3: Data Export Feature

```markdown
[CAPABILITY EVAL: data-export-csv]

Task: ユーザーデータをCSV形式でエクスポートする機能を実装する

Success Criteria:
  - [x] CSVファイルが正しいフォーマットで生成される
  - [x] 大量データ（10万件以上）でもメモリ効率が良い
  - [x] ダウンロードAPIエンドポイントが動作する
  - [ ] 非同期エクスポートがサポートされる
  - [x] 文字エンコーディング（UTF-8 BOM）が正しい

Expected Output:
  - GET /api/export/users → CSV file download
  - Content-Type: text/csv; charset=utf-8
  - Content-Disposition: attachment; filename="users-YYYY-MM-DD.csv"

Constraints:
  - ストリーミング処理でメモリ消費を抑制
  - 最大エクスポート件数: 100万件

Test Command: npm run test:export

Result: 4/5 criteria met
Status: PARTIAL PASS

Notes:
  - 非同期エクスポートは次のスプリントで実装予定
```

---

## Example 4: Search Feature with Elasticsearch

```markdown
[CAPABILITY EVAL: elasticsearch-search]

Task: Elasticsearchを使用した全文検索機能を実装する

Success Criteria:
  - [x] 基本的なキーワード検索が動作する
  - [x] ファセット検索（フィルタリング）がサポートされる
  - [x] ハイライト機能が動作する
  - [x] ページネーションが正しく実装される
  - [x] 検索結果のソートが機能する
  - [x] 検索サジェスト（オートコンプリート）が動作する

Expected Output:
  - GET /api/search?q=keyword → { hits: [...], total: N, facets: {...} }
  - レスポンス時間: 200ms以内

Constraints:
  - Elasticsearch 8.x 使用
  - 日本語形態素解析（kuromoji）対応
  - 同義語辞書のサポート

Test Command: npm run test:search

Result: 6/6 criteria met
Status: PASS
```

---

## Template for New Capability Eval

```markdown
[CAPABILITY EVAL: <feature-name>]

Task: <達成すべきタスクの詳細説明>

Success Criteria:
  - [ ] <成功基準1 - 測定可能で明確に>
  - [ ] <成功基準2>
  - [ ] <成功基準3>
  - [ ] <成功基準4>
  - [ ] <成功基準5>

Expected Output: 
  <期待される出力の具体例>

Constraints:
  - <制約条件1>
  - <制約条件2>
  - <制約条件3>

Test Command: <テスト実行コマンド>

Result: X/Y criteria met
Status: <PASS|PARTIAL PASS|FAIL>

Notes:
  - <追加の注記や改善点>
```
