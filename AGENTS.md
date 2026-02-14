# AGENTS.md — MUSUBIX v3.8.2

> Neuro-Symbolic AI Integration System | TypeScript | Node.js 20+ | npm workspaces
> 25 packages | 5,738+ tests | 107 MCP tools | 13 Agent Skills

## Commands

```bash
# Build / Test / Lint
npm run build                # tsc -b (全25パッケージ)
npm run test                 # Vitest 全テスト
npm run test:unit            # ユニットテストのみ
npm run test:coverage        # カバレッジ計測
npm run lint && npm run lint:fix
npm run typecheck            # TypeScript型チェック
npm run format               # Prettier
npm run clean                # dist/ + tsbuildinfo 削除
```

```bash
# SDD ワークフロー (要件→設計→タスク→実装)
npx musubix init [path] [--name <name>] [--force]
npx musubix requirements analyze <file>          # 自然言語→EARS変換
npx musubix requirements validate <file>         # EARS構文検証
npx musubix requirements new <feature>           # 対話的要件作成
npx musubix design generate <requirements>       # 要件→設計
npx musubix design validate <file>               # SOLID準拠検証
npx musubix design c4 <file>                     # C4ダイアグラム
npx musubix design adr <decision>                # ADR生成
npx musubix design traceability [--min-coverage 80]
npx musubix codegen generate <design> [--full-skeleton] [--with-tests]
npx musubix codegen analyze <path>               # 静的解析
npx musubix codegen security <path>              # セキュリティスキャン
npx musubix codegen status <spec> [--enum]       # ステータス遷移
npx musubix test generate <path>
npx musubix trace matrix [-p <project>]          # トレーサビリティ
npx musubix trace validate && npx musubix trace sync [--dry-run]
```

```bash
# 知識・ADR・ポリシー
npx musubix knowledge add <type> <id> <name>     # エンティティ追加
npx musubix knowledge get|delete|query|traverse|stats|link
npx musubix decision create|list|get|accept|deprecate|search|index
npx musubix policy validate|list|info|check
```

```bash
# 学習・パターン
npx musubix learn status|dashboard|patterns|best-practices|bp-list|bp-show
npx musubix learn recommend -a <code|design|test>  # -a 必須
npx musubix learn wake|sleep|cycle|compress|decay|feedback|export|import
npx musubix learn add-pattern <name> | remove-pattern <id>
```

```bash
# コードグラフ・合成・その他
npx musubix cg index <path>                      # 16言語対応
npx musubix cg query|search|deps|callers|callees|languages|stats
npx musubix synthesize <examples.json> | syn | synthesize pbe
npx musubix deep-research <query> [-i <iterations>] [-o <file>]
npx musubix scaffold domain-model <name> [-e "E1,E2"] [-d PREFIX] [-v "VO"] [-s "E=status"]
npx musubix scaffold minimal|api-service <name>
npx musubix perf benchmark|startup|memory
npx musubix skills list|validate
npx musubix ontology validate|check-circular|stats
npx musubix explain why|graph <id>
npx musubix library learn|query|stats
npx musubix watch [paths] [--lint] [--test] [--security]
npx musubix repl
```

## Boundaries

**Always do:**
- `steering/` を読んでからコード生成
- EARS形式で要件記述 (`WHEN/WHILE/IF/THE...SHALL`)
- `codegen --with-tests` でテスト同時生成
- `trace matrix` でトレーサビリティ維持
- Result<T,E> で失敗可能操作をラップ
- interface + factory関数 で Value Object実装

**Ask first:**
- Phase遷移（要件→設計→タスク→実装 各承認必須）
- 設計からタスク分解をスキップして実装に進むこと（禁止）
- パッケージ依存関係の変更
- `storage/` 配下の仕様書変更

**Never do:**
- Phase 2（設計）から直接Phase 4（実装）へ遷移
- EARS形式以外での要件記述
- テストなしでの実装完了
- `steering/` 未参照での設計決定

## SDD Workflow

```
Phase 1: 要件定義  → requirements analyze → EARS検証 → 承認
Phase 2: 設計      → design generate → SOLID検証 → 承認
Phase 3: タスク分解 → タスク定義 → 依存関係整理 → 承認  ← スキップ禁止
Phase 4: 実装      → test(Red) → 実装(Green) → リファクタ(Blue)
Phase 5: 完了      → trace validate → CHANGELOG → コミット
```

## Project Structure

| カテゴリ | パッケージ |
|----------|------------|
| Core | `musubix` (CLI), `@nahisaho/musubix-core`, `@musubix/knowledge`, `@nahisaho/musubix-codegraph`, `@nahisaho/musubi` |
| SDD | `sdd-ontology`, `@musubix/decisions`, `synthesis`, `@musubix/policy` |
| Verification | `formal-verify`, `lean` |
| Agent | `assistant-axis`, `expert-delegation`, `skill-manager`, `agent-orchestrator` |
| Learning | `wake-sleep`, `deep-research`, `library-learner` |
| Infra | `neural-search`, `workflow-engine`, `dfg`, `security`, `mcp-server`, `ontology-mcp`, `pattern-mcp` |

## Steering (Project Memory)

| ファイル | 参照タイミング |
|----------|----------------|
| `steering/product.ja.md` | プロジェクト理解時 |
| `steering/structure.ja.md` | 設計・実装時 |
| `steering/tech.ja.md` | 技術選定時 |
| `steering/rules/*.md` | コード生成時 |

## Constraints

- **TypeScript strict** + **Vitest** + **Prettier** + **ESM**
- npm workspaces モノレポ（`tsc -b` インクリメンタルビルド）
- 9憲法条項: Library-First, CLI, Test-First, EARS, Traceability, Project Memory, Design Patterns, ADR, Quality Gates
- 詳細: `CLAUDE.md`（MCP全107ツール、ベストプラクティス17件、コード例）

---

**v3.8.2** | 2026-02-08
