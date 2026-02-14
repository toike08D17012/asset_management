# Codemap Index Template

MUSUBIX コードマップのインデックステンプレートです。

---

## 📍 Entry Points

### CLI Commands
| Command | Location | Description |
|---------|----------|-------------|
| `musubix init` | [packages/core/src/cli/commands/init.ts](packages/core/src/cli/commands/init.ts) | プロジェクト初期化 |
| `musubix requirements` | [packages/core/src/cli/commands/requirements.ts](packages/core/src/cli/commands/requirements.ts) | 要件分析 |
| `musubix design` | [packages/core/src/cli/commands/design.ts](packages/core/src/cli/commands/design.ts) | 設計生成 |
| `musubix codegen` | [packages/core/src/cli/commands/codegen.ts](packages/core/src/cli/commands/codegen.ts) | コード生成 |

### MCP Tools
| Tool | Location | Description |
|------|----------|-------------|
| `sdd_create_requirements` | [packages/mcp-server/src/tools/](packages/mcp-server/src/tools/) | 要件作成 |
| `pattern_extract` | [packages/pattern-mcp/src/](packages/pattern-mcp/src/) | パターン抽出 |
| `knowledge_put_entity` | [packages/knowledge/src/](packages/knowledge/src/) | 知識グラフ操作 |

---

## 🔌 Integration Points

### External Systems
```
┌──────────────────────────────────────────────────────────┐
│                    MUSUBIX System                        │
├──────────────────────────────────────────────────────────┤
│  MCP Server ←→ Claude/Copilot                           │
│  Knowledge Store ←→ .knowledge/graph.json               │
│  Policy Engine ←→ steering/rules/                       │
│  Codegraph ←→ TypeScript AST                            │
└──────────────────────────────────────────────────────────┘
```

### Package Dependencies
```
core
├── mcp-server (depends on)
├── security (depends on)
└── formal-verify (depends on)

knowledge
├── policy (depends on)
└── decisions (depends on)

agent-orchestrator
├── workflow-engine (depends on)
├── skill-manager (depends on)
└── expert-delegation (depends on)
```

---

## 📊 Key Data Flows

### Requirements → Code Flow
```
1. Natural Language (User Input)
   ↓
2. EARS Requirements (REQ-*)
   ↓ [packages/core/src/validators/ears-validator.ts]
3. C4 Design (DES-*)
   ↓ [packages/core/src/design/]
4. Implementation Tasks (TSK-*)
   ↓ [packages/core/src/codegen/]
5. Generated Code
```

### Pattern Learning Flow
```
1. Code Observation
   ↓
2. Pattern Extraction [packages/pattern-mcp/]
   ↓
3. Pattern Storage [packages/library-learner/]
   ↓
4. Pattern Query & Reuse
```

---

## 🧩 Core Abstractions

### Entities
- `Requirement`: EARS形式の要件
- `Design`: C4モデルの設計
- `Pattern`: 学習済みコードパターン
- `Entity`: Knowledge Graph のエンティティ

### Services
- `EarsValidator`: EARS構文検証
- `PatternLibrary`: パターン管理
- `KnowledgeStore`: 知識グラフ操作
- `PolicyEngine`: 憲法条項検証

### Bridges (Integration)
- `PatternBridge`: Core ↔ Pattern-MCP
- `KnowledgeBridge`: Core ↔ Knowledge
- `QualityGateBridge`: Core ↔ Policy
- `CodemapBridge`: Core ↔ Codegraph
- `RefactorCleanerBridge`: Core ↔ Security

---

## 🔍 Quick Navigation

### "Where is X defined?"

| Concept | Location |
|---------|----------|
| EARS Patterns | [packages/core/src/validators/ears-patterns.ts](packages/core/src/validators/ears-patterns.ts) |
| 10 Constitution Articles | [steering/rules/constitution.md](steering/rules/constitution.md) |
| MCP Tool Definitions | [packages/mcp-server/src/tools/](packages/mcp-server/src/tools/) |
| Type Definitions | [packages/core/src/types/](packages/core/src/types/) |

### "How does Y work?"

| Feature | Key Files |
|---------|-----------|
| Pattern Learning | `packages/pattern-mcp/src/pattern-library.ts`, `packages/wake-sleep/src/` |
| Traceability | `packages/core/src/traceability/` |
| Formal Verification | `packages/formal-verify/src/`, `packages/lean/src/` |
| Neural Search | `packages/neural-search/src/` |

---

## 📝 Update Instructions

このファイルを更新する際の手順：

1. 新しいパッケージ追加時 → Integration Points セクション更新
2. 新しい CLI コマンド追加時 → Entry Points セクション更新
3. 新しい Bridge 追加時 → Core Abstractions セクション更新
4. 新しい型定義追加時 → Quick Navigation セクション更新

**更新者**: 各パッケージのメンテナ
**頻度**: リリースごと
